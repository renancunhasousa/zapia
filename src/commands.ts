// ---------- Importações ----------
import { addInteractions, setPrePrompt } from "./config.ts";
import { MessageMedia, Client, MessageTypes } from 'whatsapp-web.js';
import { createCanvas } from 'canvas';
import Replicate from "replicate";
import { userPhone } from "./index.ts";
import { handleMessageDALLE2, handleMessageDALLE3, handleMessageStableDiffusion, handleMessageMidJourney, handleMessageDALLevar} from './handlers/dalle.ts';
import { setTTSEnabled,	setTranscriptionEnabled, authorizedUser,
	        resetInteractions, setLimitedInteractions, setTtsVoiceIdAws, setTtsVoiceIdOpenai,
	        setTtsMode, setGptModel, setPlatformUrl, setTranscriptionMode,
	        setImgModel, authorizedUserCommand, setSearchTool,  } from './config.ts';
import path from 'path';
import BrowserAgentProvider from "./providers/browser-agent";
import * as cli from "./cli/ui";
import client from './types/client.ts'
import ytdl from 'ytdl-core';
import fs from 'fs';
import * as FileType from 'file-type';
import axios from 'axios';


// Função para cancelar o comando
function cancelCommand(message) {
	message.reply(`🕹 comando cancelado`);
}

 // Função para tratar o comando .stk
 async function handleStkCommand(message, sender, client) {
    const chat = await message.getChat();
    chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, 2000));  
	async function createTransparentImage(text, fontSize = 32) {
		const canvas = createCanvas(512, 512);
		const ctx = canvas.getContext('2d');
	  
		ctx.font = `${fontSize}px Arial`;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
	  
		ctx.fillStyle = 'rgba(255, 255, 255, 0)';
		ctx.fillRect(0, 0, 512, 512);
	  
		ctx.fillStyle = 'black';
		ctx.fillText(text, 256, 256 - fontSize / 5);
	  
		const buffer = canvas.toBuffer('image/png');
	  
		return `data:image/png;base64,${buffer.toString('base64')}`;
	  }
	try {
		let media: MessageMedia | null = null;
	
		const validUrlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/;
	
		if (validUrlPattern.test(message.body)) {
		  try {
			  const { data } = await axios.get(message.body, { responseType: 'arraybuffer' });
			  const returnedB64 = Buffer.from(data);
			  const fileType = await FileType.fileTypeFromBuffer(returnedB64);
			  let mimeType;
	
			  if (fileType) {
				  mimeType = fileType.mime;
				  if (fileType.ext === 'gif') {
					  mimeType = 'image/gif';
				  }
				  media = new MessageMedia(mimeType, returnedB64.toString('base64'), `image.${fileType.ext}`);
			  } else {
				  throw new Error("_Não foi possível identificar o tipo de arquivo_");
			  }
		  } catch (e) {
			  throw new Error("_Não foi possível baixar a imagem da URL_ " + e.message);
		  }
		} else if (message.type === MessageTypes.TEXT) {
		  const stickerText = message.body.trim();
		  if (stickerText.length > 40) {
			throw new Error("_O texto é muito longo para criar um sticker_");
		  }
		  const base64Image = await createTransparentImage(stickerText);
		  media = new MessageMedia("image/png", base64Image.split(',')[1], "sticker.png");
		} else if (message.type === MessageTypes.IMAGE || message.type === MessageTypes.VIDEO || message.type === MessageTypes.STICKER) {
			try {
				media = await message.downloadMedia();
			} catch (e) {
				throw new Error('💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
			}
		} else {
			const chat = await client.getChatById(message.id.remote);
			await chat.sendSeen();
			return;
		}
	
		if (media) {
			const chat = await message.getChat();
								chat.sendStateTyping();
								await new Promise(resolve => setTimeout(resolve, 2000));
			await client.sendMessage(sender, media, {
				sendMediaAsSticker: true,
				stickerIsAnimated: media.mimetype === "image/gif",
				stickerName: 'ZAPIA comando [.stk]',
				stickerAuthor: '@zapia.bot'
			});
		} else {
			throw new Error;
		}
	  } catch (e) {
		  console.log(e);
		  message.reply('💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._ ' + e.message);
		  return;
	  }
	}

async function handleVarCommand(message, userConfig, userPhone) {
	if (message.type === MessageTypes.IMAGE){
		try {
							
			const media = await message.downloadMedia();
            const prompt = message.body;
							
			const imageFilePath = `temp_${Date.now()}.png`;
			await fs.promises.writeFile(imageFilePath, media.data, 'base64');

			const stats = await fs.promises.stat(imageFilePath);
			const fileSizeInBytes = stats.size;
			const fileSizeInMB = fileSizeInBytes / (1024 * 1024); 
							
			console.log(`Tamanho do arquivo: ${fileSizeInMB} MB`);
							
			// Verifique a extensão do arquivo
			const fileExtension = imageFilePath.split('.').pop();
			console.log(`Extensão do arquivo: ${fileExtension}`);
							
			await handleMessageDALLevar(client, message, imageFilePath, prompt, userConfig, userPhone);

				} catch (e) {
						throw new Error('_Isso não parece ser uma imagem válida. Garanta que a imagem seja de até 4Mb em formato .png._');
				}
			}
		}		
		
        async function handleUrsCommand(client, message, link, userConfig) {
        const chat = await message.getChat();
    	chat.sendStateTyping();
    	await new Promise(resolve => setTimeout(resolve, 2000));  
            switch (userConfig.urlShorten) {
                case 'linkdev':
                    try {
                        const response = await axios.post('https://api.encurtador.dev/encurtamentos', {
                            url: link
                        });
                        let linkEncurtado = response.data.urlEncurtada;
        
                        // Verifica se o link encurtado já possui "http://" ou "https://"
                        if (linkEncurtado && !/^https?:\/\//i.test(linkEncurtado)) {
                            linkEncurtado = 'http://' + linkEncurtado;
                        }
        
                        if (linkEncurtado) {
                            message.reply(`🔗 URL:\n\n${linkEncurtado}`);
                        } else {
                            message.reply('💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
                        }
        
                        return linkEncurtado;
                    } catch (error) {
                        console.error(error);
                        message.reply(
                            '💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
                        return null;
                    }
        
                case 'bitly':
                    const bitlyAccessToken = 'f54745de98c5567929de5d0dffc937a82572d7fd'
                    try {
                        const response = await axios.post(
                            'https://api-ssl.bitly.com/v4/shorten',
                            {
                                long_url: link,
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${bitlyAccessToken}`,
                                    'Content-Type': 'application/json',
                                },
                            }
                        );
                        const linkEncurtado = response.data.link;
        
                        if (linkEncurtado) {
                            message.reply(`🔗 URL:\n\n${linkEncurtado}`);
                        } else {
                            message.reply('💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
                        }
        
                        return linkEncurtado;
                    } catch (error) {
                        console.error(error);
                        message.reply(
                            '💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
                        return null;
                    }
        
        
                case 'cuttly':
                    const cuttlyApiKey = '8839e0e42087b12132e3ae5da2f253acc1325'
                    try {
                        const response = await axios.get('https://cutt.ly/api/api.php', {
                            params: {
                                key: cuttlyApiKey,
                                short: link,
                            },
                        });
        
                        console.log('Cutt.ly full response:', response.data);
        
                        const resultCode = response.data.url.status;
                        if (resultCode === 7) {
                            const linkEncurtado = response.data.url.shortLink;
        
                            if (linkEncurtado) {
                                message.reply(`🔗 URL:\n\n${linkEncurtado}`);
                            } else {
                                message.reply('💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
                            }
        
                            return linkEncurtado;
                        } else {
                            console.error('Cutt.ly error:', resultCode);
                            message.reply(
                                '💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
                            return null;
                        }
                    } catch (error) {
                        console.error(error);
                        message.reply(
                            '💬 Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
                        return null;
                    }
        
                default:
                    message.reply(
                        '💬 _O serviço de encurtamento de URL não é suportado. Por favor, verifique a configuração ou selecione outra plataforma enviado *.url* ao bot._'
                    );
                    return null;
            }
        }
        
	
async function handleMp4Command(client, message, url) {
        const chat = await message.getChat();
    	chat.sendStateTyping();
    	await new Promise(resolve => setTimeout(resolve, 2000));  
	try {
		console.log(url);
	
		if (!ytdl.validateURL(url)) {
		  return message.reply('_URL de vídeo inválida_');
		}
	
		const info = await ytdl.getInfo(url);
	
		const videoDuration = parseInt(info.videoDetails.lengthSeconds, 10) * 1000;
		if (videoDuration > 300000) {
		  return message.reply(
			'_O vídeo excede o limite de 5 minutos. Por favor, tente um vídeo menor_'
		  );
		}
	
		const fileExt = '.mp4';
		const filename = `video_${Date.now()}${fileExt}`;
		const filePath = path.join(__dirname, 'downloads', filename);
	
		const stream = ytdl(url, { filter: 'audioandvideo' });
	
		const msg =
		  '*Título  :*\n' +
		  '```' +
		  info.videoDetails.title +
		  '```\n\n' +
		  '🙋‍♂️ *Autor :*\n  ' +
		  '```' +
		  info.videoDetails.author.name +
		  '```\n\n' +
		  '🎥 *Views  :*  ' +
		  '```' +
		  info.videoDetails.viewCount +
		  '```\n' +
		  '👍 *Likes   :*  ' +
		  '```' +
		  info.videoDetails.likes +
		  '```\n' +
		  '👎 *Dislikes   :*  ' +
		  info.videoDetails.dislikes +
		  '```';
	
		await client.sendMessage(message.from, '📥 _YouTube, Baixando..._');
	
		stream.on('progress', (_, downloaded, total) => {
		  const percent = (downloaded / total) * 100;
		  console.log(`Progresso do download: ${percent.toFixed(25)}%`);
	
		  if (percent >= 25) {
			message.reply(`📥 _YouTube, Baixando..._ *${percent.toFixed(0)}%*`);
		  }
		});
	
		const mediaBlob = fs.createWriteStream(filePath);
	
		stream.pipe(mediaBlob);
	
		mediaBlob.on('finish', async () => {
		  const media = MessageMedia.fromFilePath(filePath);
		  await client.sendMessage(message.from, media, { caption: msg });
		  fs.unlinkSync(filePath);
		});
	
	  } catch (error) {
		console.error(error);
		message.reply('💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
	  }
	}
			

async function handlePptCommand(message, userConfig, prompt) {				
	if (prompt === '0') {
		setPrePrompt(userConfig, undefined, userPhone);
		message.reply(
		`💬 _Prompt sem pré-configuração_\n\n*<vazio>*`);
	} else {
		setPrePrompt(userConfig, prompt, userPhone);
		message.reply(`Prompt ativo:\n*"${prompt}"*`);
	}
}
				
async function handleImgCommand(message, userConfig, prompt) {
	addInteractions(userConfig, 1, userPhone)
	switch (userConfig.dalleModel) {
		case 'DALLE2':
		  return handleMessageDALLE2(client, message, prompt, userConfig, userPhone);
		case 'DALLE3':
		  return handleMessageDALLE3(client, message, prompt, userConfig, userPhone);
		case 'Stable Diffusion':
		  return handleMessageStableDiffusion(client, message, prompt, userConfig, userPhone);
		case 'Mid Journey':
		  return handleMessageMidJourney(client, message, prompt, userConfig, userPhone);
	  }
	}


async function handleClmCommand(location: string, message: any, client: Client): Promise<void> {
	const WEATHERSTACK_API_KEY = '2af8ca562b5cb161953ed749d7d8e3a6';
	  
	const weatherDescriptions = {
		'Partly cloudy': '🌤 Parcialmente nublado',
		'Overcast': '🌥 Nublado',
		'Clear': '☀ Céu limpo',
		'Mist': '🌫 Nevoeiro',
		'Patchy rain possible': '☂ Possibilidade de chuva',
		'Light rain': '🌦 Chuva leve',
		'Moderate rain': '🌧 Chuva moderada',
		'Heavy rain': '⛈ Chuva forte',
		'Sunny': '🌞 Ensolarado'
	};
  
	const apiUrl = `http://api.weatherstack.com/current?access_key=${WEATHERSTACK_API_KEY}&query=${location}&lang=pt`;
  
	try {
		const response = await axios.get(apiUrl);
		const data = response.data;
		const currentData = data.current;
  
		currentData.weather_description = weatherDescriptions[currentData.weather_descriptions[0]];
  
		const messageText = `
  Clima para:
  *${location}*
  
  🌡 Temp.:
  *${currentData.temperature}ºC*
  
  💨 Vento (velocidade):
  *${currentData.wind_speed} km/h*
  
  💨 Vento (Direção):
  *${currentData.wind_dir}*
  
  💨 Vento (ângulo):
  *${currentData.wind_degree}º*
  
  💧 Chance de chuva:
  *${currentData.precip}%*
  
  💦 Humidade:
  *${currentData.humidity}%*
  
  ☁️ Cobertura de nuvem:
  *${currentData.cloudcover}%*
  
  🔥 Sensação térmica:
  *${currentData.feelslike}ºC*
  
  ☀ Raio UV:
  *${currentData.uv_index}*
  
  👀 Visibilidade:
  *${currentData.visibility} km*
  
  🌞 Dia claro?:
  *${currentData.is_day === 'yes' ? 'Sim/Yes' : 'Não/No'}*
  
  Tempo atual:
  *${currentData.weather_description}*
  `;
  
		await client.sendMessage(message.from, messageText);
	} catch (e) {
		console.error(e);
		await message.reply('💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._');
	}
  }
	


async function handleNetCommand(message, prompt) {
    const chT = await message.getChat();
    chT.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, 2000));
    const browserAgent = new BrowserAgentProvider();
	const chat = await message.getChat();
								chat.sendStateTyping();
								await new Promise(resolve => setTimeout(resolve, 2000));
	   
	try {
		const start = Date.now();
		const output = await browserAgent.fetch(prompt);
		const end = Date.now() - start;

		cli.print(`[GPT] Answer to ${message.from}: ${output}  | OpenAI request took ${end}ms)`);

		// Default: Text reply
		message.reply(output);
	} catch (error: any) {
		console.error("An error occured", error);
		message.reply("💬 _Um erro ocorreu, aguarde um pouco e tente novamente mais tarde, ou entre em contato com nosso suporte._ (" + error.message + ")");
	}
    
};


async function handleBotCommand(userConfig, userPhone, buttonText, message) {
	let responseMessage;
  switch (buttonText) {
      case '1':
          setGptModel(userConfig, 'gpt-3.5-turbo', userPhone);
          responseMessage = '🤖 *gpt-3.5-turbo* ativado';
          break;
      case '2':
          setGptModel(userConfig, 'gpt-4-1106-preview', userPhone);
          responseMessage = '🤖 *gpt-4-turbo* ativado';
          break;
      case 'x':
          setGptModel(userConfig, 'auto-gpt', userPhone);
          responseMessage = '🤖 *auto-gpt* ativado';
          break;
      case '3':
          setSearchTool(userConfig, true, userPhone);
          responseMessage = '🌐 *conectado*';
          break;
      case '4':
          setSearchTool(userConfig, false, userPhone);
          responseMessage = '🌐 *desconectado*';
          break;
      case '5':
          setImgModel(userConfig, 'DALLE2', userPhone);
          responseMessage = '📸 *DALL-e 2* ativado';
          break;
      case '6':
           setImgModel(userConfig, 'DALLE3', userPhone);
           responseMessage = '📸 *DALL-e 3* ativado';
           break;
      case '7':
          setImgModel(userConfig, 'Stable Diffusion', userPhone);
          responseMessage = '📸 *Stable Diffusion* ativado';
          break;
      case '8':
          setImgModel(userConfig, 'Mid Journey', userPhone);
          responseMessage = '📸 *Mid Journey* ativado';
          break;
      case '0':
          responseMessage = '🕹 comando cancelado';
          break;
      default:
        setGptModel(userConfig, buttonText, userPhone);
        responseMessage = `🤖 *${buttonText}* ativado`;
        break
          
  }

  message.reply(responseMessage);
}    

async function handleAudCommand(userConfig, userPhone, buttonText, message, statusTtsMode) {
	let responseMessage;
    console.log(statusTtsMode)
    if (statusTtsMode === 'aws-polly') {
    switch (buttonText) {
        case '1':
            setTTSEnabled(userConfig, true, userPhone);
            responseMessage = '🟢 *áudio* ativado';
            break;
        case '2':
            setTTSEnabled(userConfig, false, userPhone);
            responseMessage = '🔴 *áudio* desativado';
            break;
        case '3':
            setTtsVoiceIdAws(userConfig, 'Ricardo', userPhone);
            responseMessage = '🗣 *Ricardo (português)* ativado';
            break;
        case '4':
            setTtsVoiceIdAws(userConfig, 'Vitoria', userPhone);
            responseMessage = '🗣 *Vitoria (português)* ativado';
            break;
        case '5':
            setTtsVoiceIdAws(userConfig, 'Kevin', userPhone);
            responseMessage = '🗣 *Kevin (inglês)* ativado';
            break;
        case '6':
            setTtsVoiceIdAws(userConfig, 'Kimberly', userPhone);
            responseMessage = '🗣 *Kimberly (inglês)* ativado';
            break;
        case '7':
            setTtsMode(userConfig, "openai", userPhone);
            responseMessage = '🔈 *OpenAI* ativado';
            break;
        case 'a':
            setTranscriptionEnabled(userConfig, true, userPhone);
            responseMessage = '✍️ *transcrição* ativado';
            break;
        case 'b':
            setTranscriptionEnabled(userConfig, false, userPhone);
            responseMessage = '✍️ *transcrição* desativada';
            break;
        case '0':
            responseMessage = '🕹 comando cancelado';
            break;
        default:
            responseMessage = '🚫 _Opção inválida_';
            break;
    }
} else { 
        switch (buttonText) {
            case '1':
                setTTSEnabled(userConfig, true, userPhone);
                responseMessage = '🟢 *áudio* ativado';
                break;
            case '2':
                setTTSEnabled(userConfig, false, userPhone);
                responseMessage = '🔴 *áudio* desativado';
                break;
            case '3':
                setTtsVoiceIdOpenai(userConfig, 'alloy', userPhone);
                responseMessage = '🗣 *Alloy* ativado';
                break;
            case '4':
                setTtsVoiceIdOpenai(userConfig, 'echo', userPhone);
                responseMessage = '🗣 *Echo* ativado';
                break;
            case '5':
                setTtsVoiceIdOpenai(userConfig, 'fable', userPhone);
                responseMessage = '🗣 *Fable* ativado';
                break;
            case '6':
                setTtsVoiceIdOpenai(userConfig, 'onyx', userPhone);
                responseMessage = '🗣 *Onyx* ativado';
                break;
            case '7':
                 setTtsVoiceIdOpenai(userConfig, 'nova', userPhone);
                 responseMessage = '🗣 *Nova* ativado';
                 break;
            case '8':
                setTtsVoiceIdOpenai(userConfig, 'shimmer', userPhone);
                responseMessage = '🗣 *Shimmer* ativado';
                break;
            case '9':
                setTtsMode(userConfig, "aws-polly", userPhone);
                responseMessage = '🔈 *aws-polly* ativado';
                break;
            case 'a':
                setTranscriptionEnabled(userConfig, true, userPhone);
                responseMessage = '✍️ *transcrição* ativado';
                break;
            case 'b':
                setTranscriptionEnabled(userConfig, false, userPhone);
                responseMessage = '✍️ *transcrição* desativada';
                break;
            case '0':
                responseMessage = '🕹 comando cancelado';
                break;
            default:
                responseMessage = '🚫 _Opção inválida_';
                break;
        }//Alloy ; Echo ; Fable ; Onyx ; Nova ; Shimmer
    }

    message.reply(responseMessage);
}		

async function handleAdmCommand(userConfig, targetUserPhone, buttonText, message) {				
	let responseMessage;
    console.log('targetUserPhone inside handleAdmOptions:', targetUserPhone);

    switch (buttonText) {
        case '1':
            authorizedUser(userConfig, true, targetUserPhone);
            responseMessage = `_VIP adicionado ao número_ *${targetUserPhone}*`;
            break;
        case '2':
            authorizedUser(userConfig, false, targetUserPhone);
            responseMessage = `_VIP removido ao número_ *${targetUserPhone}*`;
            break;
        case '3':
            authorizedUserCommand(userConfig, true, targetUserPhone);
            responseMessage = `_Comandos adicionado ao número_ *${targetUserPhone}*`;
            break;
        case '4':
            authorizedUserCommand(userConfig, false, targetUserPhone);
            responseMessage = `_Comandos removido ao número_ *${targetUserPhone}*`;
            break;
        case '5':
            setLimitedInteractions(userConfig, 50, targetUserPhone);
            responseMessage = `_Limite 50 msg definido ao número_ *${targetUserPhone}*`;
            break;
        case '6':
            setLimitedInteractions(userConfig, 250, targetUserPhone);
            responseMessage = `_Limite 250 msg definido ao número_ *${targetUserPhone}*`;
            break;
        case '7':
            setLimitedInteractions(userConfig, 500, targetUserPhone);
            responseMessage = `_Limite 500 msg definido ao número_ *${targetUserPhone}*`;
            break;
        case '8':
            setLimitedInteractions(userConfig, 0, targetUserPhone);
            responseMessage = `_Limite 0 msg definido ao número_ *${targetUserPhone}*`;
            break;
        case '9':
            resetInteractions(userConfig, 0, targetUserPhone);
            responseMessage = `_Interações resetadas para_ *${targetUserPhone}*`;
            break;
        case '10':
            const addCredit = 50;
            setLimitedInteractions(userConfig, addCredit, targetUserPhone);
            responseMessage = `_Adicionado + 50 msg ao número_ *${targetUserPhone}*`;
            break;
        case '0':
            responseMessage = '🕹 comando cancelado';
            break;
        default:
            responseMessage = '🚫 _Opção inválida_';
            break;
    }

    message.reply(responseMessage);
}	

async function handleUrlCommand(userConfig, userPhone, buttonText, message) {	
	let responseMessage;
	switch (buttonText) {
        case '1':
            setPlatformUrl(userConfig, 'linkdev', userPhone);
            responseMessage = '🛠 *linkdev* ativado';
            break;
        case '2':
            setPlatformUrl(userConfig, 'bitly', userPhone);
            responseMessage = '🛠 *bitly* ativado';
            break;
        case '3':
            setPlatformUrl(userConfig, 'cuttly', userPhone);
            responseMessage = '🛠 *cuttly* ativado';
            break;
        case '0':
            responseMessage = '🕹 comando cancelado';
            break;
        default:
            responseMessage = '🚫 _Opção inválida_';
            break;
    }

    message.reply(responseMessage);
}
				
async function handleSubCommand(buttonText, message) {
	let responseMessage;
    switch (buttonText) {
        case '2':
            responseMessage = `💬 _Clique no link para ser redirecionado `+
            `a página de pagamento,_\n👉 https://buy.stripe.com/00gcPh3zTb5P6d2eUZ\n\n _Dentro em 1 dia útil seu contato será ativado_`;
            break;
        case '1':
            responseMessage = `💬 _Clique no link para ser redirecionado `+
            `a página de pagamento,_\n👉 https://buy.stripe.com/5kA9D54DX5Lv58Y7sw\n\n _Dentro em 1 dia útil seu contato será ativado_`;
            break;
        case '3':
            responseMessage = `_Entre em contato com o número *19998790929* para mais informações. `+
            `Este número está vinculado ao PIX, caso seja feito a transferência envie o compravente neste número `+
            `e dentro em 1 dia crédito de utilização será ativado_`;
            break;
        case '4':
            responseMessage = `💬 _Clique no link para ser redirecionado `+
            `a página de gerenciamento de sua assinatura,_\n👉 https://bit.ly/3JYfUqM.\n\n `+
            `_Lá você  poderá renovar, cancelar, alterar método de pagamento referente ao seu plano._`;
            break;
        case '0':
            responseMessage = `🕹 comando cancelado`;
            break;
        default:
            responseMessage = '🚫 _Opção inválida_';
            break;
    }
    message.reply(responseMessage);
}


       

	export { cancelCommand, handleStkCommand, handleVarCommand, handleUrsCommand,
		handleMp4Command, handlePptCommand, handleImgCommand, handleClmCommand, 
        handleNetCommand, handleBotCommand, handleAudCommand, handleAdmCommand, 
        handleUrlCommand, handleSubCommand  };