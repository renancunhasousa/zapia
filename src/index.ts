import { getUserConfig, isAuthorized, addInteractions, setPrePrompt, setFirstTime } from "./config"
import {IConfig} from "./config";
import { handleMessageLangChain } from "./handlers/langchain";
import { weatherHandler, 
		 generateStickerFromMedia, 
		 handleBotOptions,
		 handleSpkOptions,
		 handleAdmOptions,
		 handleUrlOptions,
		 shortenLink,
		 handleSubOptions,
		 handleTxtOptions,
		 downloadVideoYT,
		 createImageAI,
		 convertToMp3
} from "./commands";
import { searchKnowledgeBase } from "./handlers/message";
import qrcode from "qrcode-terminal";
import {Message, Events, Buttons, List, MessageMedia } from "whatsapp-web.js";
import fs from "fs";
import constants from "./constants";
import * as cli from "./cli/ui";
import { handleIncomingMessage } from "./handlers/message";
import client from './client'
import { handleMessageGPT } from "./handlers/gpt";

// Ready timestamp of the bot
let botReadyTimestamp: Date | null = null;
const botPhoneNumber = '5519991522140@c.us';

// New variables to user personal configuration
let userPhone = ''

const userTtsStatus = {};
const userTranscriptionStatus = {};
const userPromptStatus = {};
const userAuthorized ={};
const userStates = {};
const userInteractions = {};
const userLimitedInteractions = {};
const userTtsMode = {};
const userTxtMode = {};
const userVoiceID ={};
const userGptModel ={};
const userDalleSize ={};
const userUrlPlatform ={};
const userImgModel ={};
const userGptOnOff ={};
const userAuthCmd ={}
const userConfigs: { [userPhone: string]: IConfig } = {};

// Entrypoint
const start = async () => {
	cli.printIntro();



	// WhatsApp auth
	client.on(Events.QR_RECEIVED, (qr: string) => {
		qrcode.generate(qr, { small: true }, (qrcode: string) => {
			cli.printQRCode(qrcode);
		});
	});

	// WhatsApp loading
	client.on(Events.LOADING_SCREEN, (percent) => {
		if (percent == "0") {
			cli.printLoading();
		}
	});

	// WhatsApp authenticated
	client.on(Events.AUTHENTICATED, () => {
		cli.printAuthenticated();
	});

	// WhatsApp authentication failure
	client.on(Events.AUTHENTICATION_FAILURE, () => {
		cli.printAuthenticationFailure();
	});

	// WhatsApp ready
	client.on(Events.READY, () => {
		// Print outro
		cli.printOutro();

		// Set bot ready timestamp
		botReadyTimestamp = new Date();
	});

	
	// WhatsApp message
	client.on(Events.MESSAGE_RECEIVED, async (message: any) => {
		userPhone = message.from;

		// Check if the message is sent by the bot itself
		if (userPhone === botPhoneNumber) return;
		
		if (!userConfigs[userPhone]) {
			userConfigs[userPhone] = await getUserConfig(userPhone);
		  }

		 const userConfig = userConfigs[userPhone];	
		 const isGroupMessage = (await message.getChat()).isGroup;

		 if (!isGroupMessage && (userConfig.isFirstTime === undefined || userConfig.isFirstTime === true)) {
			// Leia o arquivo PDF
			const pdfPath = 'E:/whatsapp-chatgpt/zapia.pdf';
			const pdfBuffer = fs.readFileSync(pdfPath);
	
			// Crie um objeto MessageMedia
			const pdfMedia = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), 'Zap.IA manual 📝');
	
			// Envie o PDF como anexo
			await message.reply(pdfMedia);
	
			userConfig.isFirstTime = false;
			setFirstTime(userConfig, false, userPhone);
		}


		  
	
		//status config users
		const statusTtsMode = userTtsMode[userPhone] ?? userConfig.ttsMode
		const voiceIdMap: { [key: string]: string } = {
			'Ricardo': 'Ricardo (pt-br)',
			'Vitoria': 'Vitoria (pt-br)',
			'Kevin': 'Kevin (en-us)',
			'Kimberly': 'Kimberly (en-us)',
		  };
		const userVoiceId = userVoiceID[userPhone] ?? userConfig.awsPollyVoiceId;
		const voiceName = voiceIdMap[userVoiceId] ?? userVoiceId;
		const isSpeechApi = statusTtsMode === 'speech-api';
		const statusVoiceID = isSpeechApi ? '🚫' : voiceName;
		const statusTts = userTtsStatus[userPhone] ?? userConfig.ttsEnabled ? '🟢 ON' : '🔴 OFF';
		const statusTsr = userTranscriptionStatus[userPhone] ?? userConfig.transcriptionEnabled? '🟢 ON' : '🔴 OFF';
		const statusTxtMode = userTxtMode[userPhone] ?? userConfig.transcriptionMode
		const statusPrompt = userPromptStatus[userPhone] || userConfig.prePrompt || '🔤 vazio/empty';
		const statusVip = userAuthorized[userPhone] ?? userConfig.authorized ? '🟢 ON' : '🔴 OFF';
		const statusInt = userInteractions[userPhone] ?? userConfig.userInteractions
		const statusLim = statusVip === '🟢 ON' ? '∞' : (userLimitedInteractions[userPhone] ?? userConfig.limitedInteractions);
		const statusGpt = userGptModel[userPhone] ?? userConfig.openAIModel
		const statusDalle = (userImgModel[userPhone] !== 'DALLE' || !userDalleSize[userPhone]) ? '512x512' : userDalleSize[userPhone];
		const statusUrl = userUrlPlatform[userPhone] ?? userConfig.urlShorten
		const statusImg = userImgModel[userPhone] ?? userConfig.dalleModel
		const statusGptOnOff = userGptOnOff[userPhone] ?? (userConfig.searchTool ? 'connected' : 'disconnected');
		const statusAuthCmd = userAuthCmd[userPhone] ?? userConfig.authorizedCommand ? '🟢 ON' : '🔴 OFF';

		//verify autorization into VIP
		async function verifyUserLimits(userPhone) {
			const userConfig = await getUserConfig(userPhone);

			if (await isAuthorized(userPhone, userConfig)) {
				return false;
		  } else if (userConfig.userInteractions >= userConfig.limitedInteractions ) {
			message.reply(
				'*Sorry* 😥\n\n'+
				'◽ _Chegamos no limite_\n'+
				`◽ _We've reached the limit_\n\n`+
				'◽ _Destrave mais interações_\n'+
				'◽ _Unlock more interactions_\n\n'+
				'💲 VIP Plan - ∞ unlimited\n'+
				'*https://bit.ly/40OkzCa*\n\n'+
				'💲 Basic Plan - ∞ unlimited.\n'+
				'*https://bit.ly/3mHds0a*\n\n'+
				'💲 PIX, contato:\n'+
				'*19998790929*\n\n'+
				'💬 _Plano pago oferece acesso extendido ao Bot e ajuda a manter '+
				'o servidor de hospedagem do Bot em funcionamento, bem como '+
				'para manter os custos do serviço pago de acesso a API da openai '+
				'para vincular a inteligência artificial ao WhatsApp_\n\n'+
				'💬 _The paid plan offers extended access to the bot and helps keep '+
				'the bot hosting server running, as well as covering the costs of the paid '+
				'OpenAI API service to link artificial intelligence to WhatsApp_'
				);
				return true;
			}
			return false;
		  }
		  // Chame a função verifyUserLimits no início
		if (await verifyUserLimits(userPhone)) {
			return;
		}
		  // status command
		if (!userStates[userPhone]) {
			userStates[userPhone] = { 
					command: null, 
					waitingForPrompt: false
		};
	}	
		//states to wainting an action
		const userState = userStates[userPhone];

		if (userState.waitingForPrompt) {
			let prompt = message.body

			switch (userState.activeCommand) {

				case '.stk':
					if (prompt === '0') {
						message.reply(
						`🕹 cancelado/canceled`);
					} else if (message.hasMedia || /^https?:\/\/.+/.test(prompt) || prompt) {
						await generateStickerFromMedia(message, message.from, client);
						addInteractions(userConfig, 1, userPhone)
					} else {
						message.reply('🚫\n\n_Formato inválido\nInvalid format_');
					}
					break

				case '.urs':
					if (prompt === '0') {
						message.reply(
						`🕹 cancelado/canceled`);
					} else {
					shortenLink(client, message, prompt, userConfig);
					addInteractions(userConfig, 1, userPhone)
					}
					break

				case '.mp4':
					if (prompt === '0') {
						message.reply(
						`🕹 cancelado/canceled`);
					} else {
					downloadVideoYT(client, message, prompt);
					addInteractions(userConfig, 1, userPhone)
					}
					break

				case '.mp3':
					if (prompt === '0') {
						message.reply(
						`🕹 cancelado/canceled`);
					} else {
					convertToMp3(client, message);
					addInteractions(userConfig, 1, userPhone)
					}
					break

				case '.ppt':
					if (prompt === '0') {
					setPrePrompt(userConfig, undefined, userPhone);
					message.reply(
					`💬 _Prompt sem pré-configuração_\n💬 _Unconfigured prompt set_\n\n*<vazio/empty>*`);
					
					} else {
					setPrePrompt(userConfig, prompt, userPhone);
					message.reply(`Prompt:\n*"${prompt}"*`);
					}
					break

				case '.img':
					if (prompt === '0') {
						message.reply(
						`🕹 cancelado/canceled`);
					} else {
					createImageAI(client, message, prompt, userConfig);
					addInteractions(userConfig, 1, userPhone)
					}
					break

				case '.gpt':
						if (prompt === '0') {
							message.reply(
							`🕹 cancelado/canceled`);
						} else {
						handleMessageGPT(message, prompt, userConfig);
						addInteractions(userConfig, 1, userPhone)
						}
					break

				case '.clm':
					if (prompt === '0') {
					message.reply(
					`🕹 cancelado/canceled`);
					} else {
					weatherHandler(prompt, message, client);
					addInteractions(userConfig, 1, userPhone)
					}
					break
				
				case '.lgn':
					if (prompt === '0') {
						message.reply(
						`🕹 cancelado/canceled`);
						} else {
					handleMessageLangChain(message, prompt);
					addInteractions(userConfig, 1, userPhone)
						}
					break

				case '.bot':
					handleBotOptions(userConfig, userPhone, prompt, message);
					break
					
				case '.aud':
					handleSpkOptions(userConfig, userPhone, prompt, message);
					break
	
				case '.adm':
					const targetUserPhone = userState.targetUserPhone;
					const targetUserConfig = userState.targetUserConfig
					handleAdmOptions(targetUserConfig, targetUserPhone, prompt, message);
					userState.targetUserPhone = null;
						break;
					
				case '.url':
					handleUrlOptions(userConfig, userPhone, prompt, message);
					break
	
				case '.sub':
					handleSubOptions(userConfig, userPhone, prompt, message);
					break
	
				case '.txt':
					handleTxtOptions(userConfig, userPhone, prompt, message);
					break

				}
			userState.waitingForPrompt = false;
			userState.activeCommand = null;
			return

				} else {

						

					if (message.body.startsWith('.')) {
						if (userConfig.authorizedCommand || 
							(!userConfig.authorizedCommand && message.body.startsWith ('.adm 5519998790929@c.us') ) ||
							(!userConfig.authorizedCommand && message.body.startsWith ('.sub') ) ||
							(!userConfig.authorizedCommand && message.body.startsWith ('.set') ) ||
							(!userConfig.authorizedCommand && message.body.startsWith ('.num') ) ||
							(!userConfig.authorizedCommand && message.body.startsWith ('.menu') )
							){
						let command = message.body;
						console.log("Comando dentro do switch:", command);

					
					switch(true) {

						case command.startsWith('.sub'):
							userState.waitingForPrompt = true;
							userState.activeCommand = '.sub';
							  
							let buttonsSub = new Buttons(
							  
							  '💬 Gostaríamos de lembrar que a *Zap.IA* oferece recursos '+
							  'valiosos e personalizados para melhorar sua experiência de comunicação.'+
							  'Gostaríamos sempre de saber como podemos melhorar nosso serviço para atender às suas necessidades '+
							  'sempre que quiser/puder converse conosco através de um de nossos canais de contato descrito ao final '+
							  'dessa mensagem. Segue nossas opções de contribuição.\n\n'+
							  '💬 We would like to remind you that *Zap.IA* offers valuable and personalized features to improve your '+
							  'communication experience. We are always interested in knowing how we can improve our services to '+
							  'meet your needs. Please feel free to contact us through one of our contact channels described at the '+
							  'end of this message whenever you want/can. Here are our contribution options:\n\n',
							  [
								{ body: '💲 VIP Plan - ∞ unlimited' },
								{ body: '💲 Basic Plan - limited' },
								{ body: '💲 PIX/Donate, contato' },
								{ body: 'gerir plano/manage plan' },
								{ body: 'back/voltar' }
							  ],
							  '🕹 *.sub*\n',
							  '*Status*\n'
							 + 'VIP: ' + statusVip +'\n' 
							 + 'uso/used: ' + statusInt +'\n' 
							 + 'limit: ' + statusLim
							);
							client.sendMessage(message.from, buttonsSub);
							return;

						case command.startsWith('.menu'):
							
							if(!userConfig.authorizedCommand){
								userState.command = '.menu';
								let sections = [
									{title:'Clique para usar | Click to use',
									rows:[
										{title:'.set', description: 'mostra configurações e plano\nget settings and plan'},
										{title:'.pin', description: 'tempo de execução do Bot\ntime of running instance from Bot'},
										{title:'.num', description: 'mostra seu número de cadastro\nget your phone number'},
										{title:'.sub', description: 'gerencia seu plano\nmanage your plan'}
									]}];
								
								let listMenu = new List('◽ _veja os comandos disponíveis em seu plano_\n◽ _see available commands in your plan_','List',sections,'🕹 *.menu*','footer');
								client.sendMessage(message.from, listMenu);
								return
							}else{  
							userState.command = '.menu';
							let sections = [
								{title:'Clique para usar | Click to use',
								rows:[
									{title:'.img', description: 'cria imagem com I.A\nmake images with A.I'},
									{title:'.stk', description: 'gera stickers de várias formas\nget several forms stickers'},
									{title:'.clm', description: 'obtém clima de uma localidade\nget climate of locality'},
									{title:'.rst', description: 'reseta contexto da conversa\nreset talking context'},
									{title:'.set', description: 'mostra configurações e plano\nget settings and plan'},
									{title:'.bot', description: 'configura as IAs (gpt e dalle)\nget AIs settings (gpt and dalle)'},
									{title:'.aud', description: 'configura mensagem de áudio\naudio response settings'},
									{title:'.pin', description: 'tempo de execução do Bot\ntime of running instance from Bot'},
									{title:'.ppt', description: 'configura como gpt agirá com você\nset a pre-prompt to gpt'},
									{title:'.txt', description: 'configura a trascrição de áudio\nconfigure audio transcription'},
									{title:'.url', description: 'define onde encurtar URLs\nSpecify where to shorten the URL'},
									{title:'.mp4', description: 'baixa vídeo youtube\nyoutube download video'},
									{title:'.urs', description: 'envie o link para encurtar\nsend the link shorten'},
									{title:'.num', description: 'mostra seu número de cadastro\nget your phone number'},
									{title:'.sub', description: 'obtém mais interações\nget more interactions'}
								]}];
      
							let listMenu = new List('◽ _veja os comandos_\n◽ _see commands_','List',sections,'🕹 *.menu*','footer');
							client.sendMessage(message.from, listMenu);
							return;
							}
				
									
						case command.startsWith('.stk'): 
							userState.activeCommand = '.stk'
							userState.waitingForPrompt = true;
							const stickerText =
								'🕹 *.stk*\n\n'+
								'💬 _Para gerar um sticker, envie uma mídia de imagem|video|gif, umaa url de imagem, ou algum texto. '+
								'(para url certifique de aer uma imagem, final da url tendo sua extensão ex: .jpg, .png)_\n\n' +
								'💬 _To generate a sticker, send a image|video|gif media, the URL of an image, or some text. '+
								'(for URL, make sure it is an image, with its extension at the end of the URL, e.g.: .jpg, .png)_'
							message.reply(stickerText);
							return;

						case command.startsWith('.lgn'): 
							userState.activeCommand = '.lgn'
							userState.waitingForPrompt = true;
							const askLgn = " o que deseja pesquisar ?"
							message.reply(askLgn);
							return;
						
						case command.startsWith('.set'):
							userState.command = '.set';
							message.reply(
								`*cmd [.aud] | Audio*`+
								`\n${statusTts}`+
								`\n🔈 ${statusTtsMode}`+
								`\n🗣 ${statusVoiceID}\n\n`+
								`*cmd [.txt] | Transcrip.*`+
								`\n${statusTsr}`+
								`\n✍ ${statusTxtMode}\n\n`+
								`*cmd [.bot] | A.I*`+
								`\n🤖 ${statusGpt}`+
								`\n🌐 ${statusGptOnOff}`+
								`\n📸 ${statusImg}`+
								`\n🖼 ${statusDalle}\n\n`+
								`*cmd [.ppt] | Prompt:*`+
								`\n${statusPrompt}\n\n`+
								`*cmd [.url] | UrlShorten:*`+
								`\n🛠 ${statusUrl}\n\n`+
								`*[Interações|interactions]:*`+
								`\n${statusInt}\n\n`+
								`*[Disponível|Available]:*`+
								`\n${statusLim}\n\n`+
								`*[Comandos|Commands]:*`+
								`\n${statusAuthCmd}\n\n`+
								`*cmd [.sub] | Plan VIP:*`+
								`\n${statusVip}`);
						
							return;
	
						case command.startsWith('.mp4'):
							userState.activeCommand = '.mp4'
							userState.waitingForPrompt = true;
							const mp4Text =
								'🕹 *.mp4*\n\n'+
								'💬 _Envie a URL do vídeo em que deseja realizar o donwload. É permitido o envio de video Shorts '+
								'e com duração de até 5 minutos, ou digite *0* para cancelar o comando_\n\n' +
								'💬 _Submit the URL of the video you want to download. It is allowed to send video shorts '+
								'and lasting up to 5 minutes, or type *0* to cancel command_'
							message.reply(mp4Text);
							return;

						case command.startsWith('.url'):
							userState.waitingForPrompt = true;
							userState.activeCommand = '.url';
							let buttonsUrl = new Buttons(
							  '◽ Escolha uma opção\n◽ Choose an option\n\n' +
							  '💬 _Escolha uma opção para encurtar seu link, caso uma não funcione tente novamente em outra. Esse comando apenas define qual plataforma utilizará, para encurtar apenas envie o link para o BOT_\n\n' +
							  '💬 _Choose an option to shorten your link, if one does not work try again with another. This command just defines which platform will use, to shorten a link, just send the link to the BOT._\n',
							  [
								{ body: 'linkdev' },
								{ body: 'bitly' },
								{ body: 'cuttly' },
								{ body: 'back/voltar' }
							  ],
							  '🕹 *.url*\n',
							  'utilize .urs para enviar o link a ser encurtado\nuse .urls to send the link to be shortened'
							 );
							client.sendMessage(message.from, buttonsUrl);
							return;
											
						case command.startsWith('.urs'):
							userState.activeCommand = '.urs'
							userState.waitingForPrompt = true;
							const DescriptTextUrl =
							  '🕹 *.urs*\n\n'+
							  '💬 _Envie o link que deseja encurtar, ou digite *0* para cancelar o comando._\n\n'+
							  '💬 _Please send the link you want to shorten, or type *0* to cancel command_'
							message.reply(DescriptTextUrl);
							return;

						case command.startsWith('.pin'):
							function secondsToHMS(seconds) {
								const h = Math.floor(seconds / 3600);
								const m = Math.floor((seconds % 3600) / 60);
								const s = Math.floor(seconds % 60);
								return `${h}h ${m}m ${s}s`;}

							  const uptimeInSeconds = botReadyTimestamp
							  ? Math.floor((Date.now() - botReadyTimestamp.getTime()) / 1000)
							  : null;
							const uptimeHMS = uptimeInSeconds ? secondsToHMS(uptimeInSeconds) : 'Indisponível/Unavailable';
							message.reply(
							  `🟢 Online: *${uptimeHMS}*`
							);
							return;

						case command.startsWith('.num'):
							 message.reply(`Telefone / PhoneNumber:\n*${message.from}*`);
							 return;
							

						case command.startsWith('.bot'):
							userState.waitingForPrompt = true;
							userState.activeCommand = '.bot';
							let buttonsBot = new Buttons(
							  '◽ Escolha uma opção\n◽ Choose an option\n\n' +
							  '💬 _Use as opções para alternar o modo gpt, tamanhos da imagem da dalle e também por qual plataforma deseja criar suas imagens_\n\n' +
							  '💬 _Use the options to switch between GPT modes and adjust DALL-E image sizes and also what platform you wish to create your images_\n',
							  [
								{ body: 'gpt-3.5-turbo' },
								{ body: 'gpt-4' },
								{ body: 'gpt online' },
								{ body: 'gpt offline' },
								{ body: 'DALLE' },
								{ body: 'Stable Diffusion' },
								{ body: 'Mid Journey' },
								{ body: 'back/voltar' }
							  ],
							  '🕹 *.bot*\n',
							  '*Status*\n'
							 + 'GPT 🤖: ' + statusGpt +'\n' 
							 + 'IMG 📸: ' + statusImg +'\n'
							 + 'size 🖼: ' + statusDalle +'\n'
							 + 'internet 🌐: ' + statusGptOnOff       
							);
							client.sendMessage(message.from, buttonsBot);
							return;

						case command.startsWith('.aud'):
							userState.waitingForPrompt = true;
							userState.activeCommand = '.aud';
							let buttonsSpk = new Buttons(
								 '◽ Escolha uma opção\n◽ Choose an option\n\n' +
								 '💬 _Use as opções para configurar o recebimento de áudio. Desligue e ligue caso queria ou não receber resposta de áudio, '+
								 'alterne para sua voz preferida com o idioma de sua escolha, e alterne entre as plataformas, assim caso uma não funcione tente ativar a outra_\n\n' +
							     '💬 _Use the options to configure audio reception. Turn it off and on whether or not you want to receive an audio response, '+
								 'switch to your preferred voice with the language of your choice, and switch between platforms, so if one doesnt work try activating the other_\n',
							  [
								{ body: 'ON' },
								{ body: 'OFF' },
								{ body: 'voz masculina (pt-BR)' },
								{ body: 'voz feminina (pt-BR)' },
								{ body: 'male voice (en-US)' },
								{ body: 'female voice (en-US)' },
								{ body: 'modo speech-api' },
								{ body: 'modo aws-polly' },
								{ body: 'back/voltar' }
							  ],
							  '🕹 *.aud*\n',									  
							  '*Status*\n'
							 + 'On | Off:  ' + statusTts +'\n'
							 + 'model 🔈: ' + statusTtsMode +'\n' 
							 + 'voz/voice 🗣: ' + statusVoiceID
							);
							client.sendMessage(message.from, buttonsSpk);
							return;	

						case command.startsWith('.txt'):
							userState.waitingForPrompt = true;
							userState.activeCommand = '.txt';
							let buttonsTxt = new Buttons(
								 '◽ Escolha uma opção\n◽ Choose an option\n\n' +
								 '💬 _Use as opções para configurar a trasncrições de áudio. Desligue e ligue caso queira ou não que o bot entenda seus áudios e o transcreva pra você e '+
								 'alterne a plataforma de trasncrição, assim caso uma não funcione tente ativar a outra._\n\n' +
							     '💬 _Use the options to configure audio transcriptions. Turn it off and on if you want the bot to understand your audios and transcribe them for you and '+
								 'switch the transcription platform, so if one doesnt work try activating the other._\n',
							  [
								{ body: 'ON' },
								{ body: 'OFF' },
								{ body: 'whisper-api' },
								{ body: 'openai' },
								{ body: 'back/voltar' }
							  ],
							  '🕹 *.txt*\n',									  
							  '*Status*\n'
							 + 'On | Off:  ' + statusTsr +'\n'
							 + 'model ✍: ' + statusTxtMode 
							
							);
							client.sendMessage(message.from, buttonsTxt);
							return;	

						case command.startsWith('.img'):
							userState.activeCommand = '.img'
							userState.waitingForPrompt = true;
							const DescriptText =
								'🕹 *.img*\n\n'+
								'💬 _Descreva a imagem que você gostaria de ver em sua próxima mensagem, ou digite *0* para cancelar o comando._\n\n'+
								'💬 _Please describe the image you would like to see in your next message, or type *0* to cancel command_'
							message.reply(DescriptText);
							return;

						case command.startsWith('.gpt'):
							userState.activeCommand = '.gpt'
							userState.waitingForPrompt = true;
							const DescripText =
								'🕹 *.gpt*\n\n'+
								'💬 _Apenas envie a mensagem que deseja que o GPT responda, ou digite *0* para cancelar o comando._\n\n'+
								'💬 _Simply send the message you want the GPT to respond to, or type *0* to cancel command_'
							message.reply(DescripText);
							return;

						case command.startsWith('.ppt'):
							userState.activeCommand = '.ppt'
							userState.waitingForPrompt = true;
							const PromptText =
								'🕹 *.ppt*\n\n'+
								'💬 _Use para incluir um pré prompt e determinar um contexto ou a forma que o GPT te responderá. '+
								'(envie a próxima mensagem descrevendo como deseja pré configura-lo), ou digite *0* para cancelar o comando. '+
								'Para que o prompt funcione resete sua conversa utilizando o comando *.rst*, após definir o pré prompt_\n\n' +
								'💬 _Use it to include a pre-prompt and determine a context or the way that GPT will respond to you. '+
								'(Send the next message describing how you want to pre-configure it), or type *0* to cancel command. ' +
								'To make the prompt work, reset your conversation using the command *.rst* after setting the pre-prompt_'
							message.reply(PromptText);
								return;

						case command.startsWith('.mp3'):
							userState.activeCommand = '.mp3'
							userState.waitingForPrompt = true;
							const textMp3 =
							'envie o video'
							message.reply(textMp3)
								return

						case command.startsWith('.clm'):
							userState.activeCommand = '.clm'
							userState.waitingForPrompt = true;
							const ClimateText =
								'🕹 *.clm*\n\n'+
								'💬 _Escreva o nome da localidade que deseja saber o clima atual, ou digite *0* para cancelar o comando_\n\n'+
								'💬 _Please write the name of the location you would like to know the current climate for, or type *0* to cancel command_'
							message.reply(ClimateText);
								return;				
		
						case command.startsWith('.adm'):
							if (message.from !== '5519998790929@c.us') {
									message.reply('Desculpe, você não tem permissão para usar este comando.')
									return;
							} else {
									const admCommandIndex = message.body.indexOf('.adm');
									const targetUserPhone = message.body.substring(admCommandIndex + 4).trim();                       
									const targetUserConfig = await getUserConfig(targetUserPhone);

									const targetStatusVip = targetUserConfig.authorized ? '🟢 *habilitado*' : '🔴 *desabilitado*';
									const targetStatusInt = targetUserConfig.userInteractions;
									const targetStatusLim = targetStatusVip === '🟢 *habilitado*' ? 'infinito' : targetUserConfig.limitedInteractions;
									const targetAuthCmd = targetUserConfig.authorizedCommand ? '🟢 *habilitado*' : '🔴 *desabilitado*';
									
									userState.targetUserPhone = targetUserPhone;
									userState.targetUserConfig = targetUserConfig;
						
									userState.activeCommand = '.adm';
									userState.waitingForPrompt = true;
								  
							let buttonsAdm = new Buttons(
								 '◽ Escolha uma opção\n\n' +
								 `💬 _Use as opções para configurar plano para_ ${targetUserPhone}\n`,
							   
							  [
								{ body: `ON VIP`},
								{ body: 'OFF VIP' },
								{ body: `ON CMD` },
								{ body: 'OFF CMD' },
								{ body: 'definir 50 msg' },
								{ body: 'definir 250 msg' },
								{ body: 'definir 500 msg' },
								{ body: 'definir 0 msg' },
								{ body: 'resetar interações' },
								{ body: '+ 50 msg' },
								{ body: 'back/voltar' }
							  ],
							  '🕹 *.adm*\n',									  
							  '*Status*\n'
							 + 'VIP:  ' + targetStatusVip +'\n'
							 + 'Interações: ' + targetStatusInt +'\n' 
							 + 'Limite: ' + targetStatusLim +'\n'
							 + 'Commandos: ' + targetAuthCmd 
							);
							client.sendMessage(message.from, buttonsAdm);
							
								// Chame novamente a função verifyUserLimits após atualizar as interações e limites do usuário
							if (await verifyUserLimits(userPhone)) {
								return;
							}
						
							return;	
							  }
						}
					}	
				}		

		// Ignore if message is from status broadcast
		if (message.from == constants.statusBroadcast) return;

		// Ignore if it's a quoted message, (e.g. Bot reply)
		if (message.hasQuotedMsg) return;

		// Notice about commands
		const messageText = message.body.toLowerCase();
		const knowledgeBaseAnswer = searchKnowledgeBase(messageText);
		
		if (knowledgeBaseAnswer) {
			// Envie a resposta da base de conhecimento e retorne para não processar o restante do código
			message.reply(knowledgeBaseAnswer);
			return;
		  }
		  
		if (!isGroupMessage) {
			await handleIncomingMessage(message, userConfig);
		}
		

	}});

	// Reply to own message
	client.on(Events.MESSAGE_CREATE, async (message: Message) => {

		
		// Check if the message is sent by the bot itself
		if (message.from === botPhoneNumber) return;

		// Ignore if message is from status broadcast
		if (message.from == constants.statusBroadcast) return;

		// Ignore if it's a quoted message, (e.g. Bot reply)
		if (message.hasQuotedMsg) return;

		// Ignore if it's not from me
		if (!message.fromMe) return;
		

		// Get the user phone number from the message sender
		const userPhone = message.from;

		// Get the user configuration using the user phone number
		const userConfig = await getUserConfig(userPhone);
		
		await handleIncomingMessage(message, userConfig);
		
	});


	// WhatsApp initialization
	client.initialize();
};

start();

export { botReadyTimestamp, userPhone, Message, userConfigs, userStates};

