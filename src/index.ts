
import { getUserConfig, isAuthorized, addInteractions, setFirstTime, IConfig, resetUserInteractions } from "./config";
import { searchKnowledgeBase, handleIncomingMessage } from "./handlers/message";
import qrcode from "qrcode-terminal";
import { Message, Events, MessageMedia, Buttons } from "whatsapp-web.js";
import constants from "./types/constants.ts";
import * as cli from "./cli/ui";
import client from './types/client.ts'
import { handleMessageGPT, handleDeleteConversation } from "./handlers/gpt";
import fs from 'fs';
import { cancelCommand, handleStkCommand, handleVarCommand, handleUrsCommand,
	handleMp4Command, handlePptCommand, handleImgCommand, handleClmCommand, 
	handleNetCommand, handleBotCommand, handleAudCommand, handleAdmCommand, 
	handleUrlCommand, handleSubCommand, 
	} from "./commands.ts"

const stripe = require('stripe')(process.env.STRIPE_KEY);


//************************************************************************************//


let botReadyTimestamp: Date | null = null;
const botPhoneNumber = '5519991522140@c.us';
let userPhone = '';
const userConfigs: { [userPhone: string]: IConfig } = {};
const debounceTimers = {};
const debounceTime = 1000;


//************************************************************************************//


const userSettings = {
    ttsStatus: {},
    transcriptionStatus: {},
    promptStatus: {},
    authorized: {},
    states: {},
    interactions: {},
    limitedInteractions: {},
    ttsMode: {},
    txtMode: {},
    voiceIDaws: {},
	voiceIDopenai: {},
    gptModel: {},
    urlPlatform: {},
    imgModel: {},
    gptOnOff: {},
    authCmd: {}
};

//************************************************************************************//



// Ponto de entrada
const start = async () => {
	cli.printIntro();

	// Autenticação do WhatsApp
	client.on(Events.QR_RECEIVED, (qr: string) => {
		qrcode.generate(qr, { small: true }, (qrcode: string) => {
			cli.printQRCode(qrcode); // Imprime o QR Code
		});
	});

	// Carregamento do WhatsApp
	client.on(Events.LOADING_SCREEN, (percent) => {
		if (percent == "0") {
			cli.printLoading(); // Imprime mensagem de carregamento
		}
	});

	// Autenticação do WhatsApp bem-sucedida
	client.on(Events.AUTHENTICATED, () => {
		cli.printAuthenticated(); // Imprime mensagem de autenticação bem-sucedida
		
	});

	// Falha na autenticação do WhatsApp
	client.on(Events.AUTHENTICATION_FAILURE, () => {
		cli.printAuthenticationFailure(); // Imprime mensagem de falha na autenticação
	});

	// WhatsApp pronto
	client.on(Events.READY, () => {
		cli.printOutro(); // Imprime mensagem final

		// Define o timestamp de quando o bot está pronto
		botReadyTimestamp = new Date();
	});


//************************************************************************************//


// Mensagem do WhatsApp
client.on(Events.MESSAGE_RECEIVED, async (message: any) => {
	userPhone = message.from;

	// Verifica se a mensagem foi enviada pelo próprio bot
	if (userPhone === botPhoneNumber) return;
	
	if (!userConfigs[userPhone]) {
		userConfigs[userPhone] = await getUserConfig(userPhone);
	}

	const userConfig = userConfigs[userPhone];	
	const isGroupMessage = (await message.getChat()).isGroup;

	if (!isGroupMessage && (userConfig.isFirstTime === undefined || userConfig.isFirstTime === true)) {
		if (debounceTimers[userPhone]) {
			clearTimeout(debounceTimers[userPhone]);
		}
		debounceTimers[userPhone] = setTimeout(async () => {
			const pdfPath = 'D:/zapia/zapia.pdf';
			const pdfBuffer = fs.readFileSync(pdfPath);
			const pdfMedia = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), 'Zap.IA manual 📝');
	
			await message.reply(pdfMedia);
	
			userConfig.isFirstTime = false;
			await setFirstTime(userConfig, false, userPhone);
		}, debounceTime);
	}

	  
//************************************************************************************//


const voiceIdMapAws = {
    'Ricardo': 'Ricardo (português)',
    'Vitoria': 'Vitoria (português)',
    'Kevin': 'Kevin (inglês)',
    'Kimberly': 'Kimberly (inglês)',
};
const voiceIdMapOpenai = {
    'alloy': 'Alloy',
    'echo': 'Echo',
    'fable': 'Echo',
    'onyx': 'Onyx',
	'nova': 'Nova',
	'shimmer': 'Shimmer',
};

const statusTtsMode = userSettings.ttsMode[userPhone] ?? userConfig.ttsMode;
const userVoiceAwsId = userSettings.voiceIDaws[userPhone] ?? userConfig.awsPollyVoiceId;
const userVoiceOpenaiId = userSettings.voiceIDopenai[userPhone] ?? userConfig.awsPollyVoiceId;
const voiceName = statusTtsMode === "aws-polly" 
    ? voiceIdMapAws[userVoiceAwsId] ?? "Ricardo" 
    : voiceIdMapOpenai[userVoiceOpenaiId] ?? "Alloy";
const statusTts = userSettings.ttsStatus[userPhone] ?? userConfig.ttsEnabled ? '🟢 ON' : '🔴 OFF';
const statusTsr = userSettings.transcriptionStatus[userPhone] ?? userConfig.transcriptionEnabled ? '🟢 ON' : '🔴 OFF';
const statusTxtMode = userSettings.txtMode[userPhone] ?? userConfig.transcriptionMode;
const statusPrompt = userSettings.promptStatus[userPhone] || userConfig.prePrompt || 'vazio';
const statusVip = userSettings.authorized[userPhone] ?? userConfig.authorized ? '🟢 ON' : '🔴 OFF';
const statusInt = userSettings.interactions[userPhone] ?? userConfig.userInteractions;
const statusLim = statusVip === '🟢 ON' ? '∞' : (userSettings.limitedInteractions[userPhone] ?? userConfig.limitedInteractions);
const statusGpt = userSettings.gptModel[userPhone] ?? userConfig.openAIModel;
const statusDalle = userConfig.dalleModel === 'DALLE2' ? '512x512' : (userConfig.dalleModel === 'DALLE3' ? '1024x1024' : 'padrão');
const statusUrl = userSettings.urlPlatform[userPhone] ?? userConfig.urlShorten;
const statusImg = userSettings.imgModel[userPhone] ?? userConfig.dalleModel;
const statusGptOnOff = userSettings.gptOnOff[userPhone] ?? (userConfig.searchTool ? 'conectado' : 'desconectado');


//************************************************************************************//



		// Verifica a autorização e limites do usuário VIP
async function verifyUserLimits(userPhone) {
    const userConfig = await getUserConfig(userPhone);

    // Se o usuário estiver autorizado, não há necessidade de verificar os limites
    if (await isAuthorized(userPhone, userConfig)) {
        return false;
    }

    // Verifica se o usuário atingiu o limite de interações
    if (userConfig.userInteractions >= userConfig.limitedInteractions) {
        const limitMessage = 
           	'💬 As suas *25* interações diárias chegaram ao fim, mas não se preocupe '+
			'pois suas interações serão restauradas as *00:00* do próximo dia. Enquanto isso, '+
			'você pode desfrutar de outras diversas ferramentas gratuitas incríveis '+
			'como previsões do tempo, criação stickers personalizados, encurtamento URLs '+
			'baixar vídeos do YouTube Shorts, e  etc. Use *.menu* e veja os comandos disponíveis!\n\n'+
			
			'Se você estiver interessado em interações ilimitadas ou usufrfuir de recursos'+
			'adicionais de configuração como por exemplo, o uso do GPT4, Dalle3, configurações de voz, '+
			'que são inteligências mais avançadas, temos algumas opções para você:\n\n'+

			'Use o comando 🕹️ *.sub* e veja nossos planos disponíveis, ou consulte o nosso catálogo aqui no WhatsApp.\n\n'+

			'Qualquer contribução é bem vinda! Com ela somos capazes de manter o bot ativo e as inteligências '+
			'artificiais em funcionamento, onde ambos possuem custo. Caso contribua com qualquer valor, como forma de '+
			'agradecimentos resetamos as 25 interações diárias disponíveis para que possa usar nosso bot novamente._'

        message.reply(limitMessage);
        return true;
    }

    return false;
}

//************************************************************************************//

// Chama a função verifyUserLimits no início
if (await verifyUserLimits(userPhone)) {
    return;
}

//************************************************************************************//

// Verificando e inicializando o estado do usuário
if (!userSettings.states[userPhone]) {
    userSettings.states[userPhone] = {
        command: null,
        waitingForResponse: false
    };
}

//************************************************************************************//

// Acessando o estado do usuário
const userState = userSettings.states[userPhone];


if (userState.waitingForResponse) {
			
	switch (userState.activeCommand) {

				case '.stk':
					if (message.body === '0') cancelCommand(message);
					else handleStkCommand(message, message.from, client);
					break;

				case '.var':
					if (message.body === '0') cancelCommand(message);
					else handleVarCommand(message, userConfig, userPhone);
					break;

				case '.urs':
					if (message.body === '0') cancelCommand(message);
					else handleUrsCommand(message, message.body, userConfig, client);
					break;

				case '.mp4':
					if (message.bodyompt === '0') cancelCommand(message);
					else handleMp4Command(client, message, message.body);
					break;				

				case '.ppt':
					handlePptCommand(message, userConfig, message.body);
					break;

				case '.img':
					if (message.body === '0') cancelCommand(message);
					else handleImgCommand(message, userConfig, message.body);
					break;
				
				case '.gpt':
					if (message.body === '0') cancelCommand(message);
					else handleMessageGPT(message, message.body, userConfig, client, userPhone);
					break;
						
				case '.clm':
					if (message.body === '0') cancelCommand(message);
					else handleClmCommand(message.body, message, client);
					break;
				
				case '.net':
					if (message.body === '0') cancelCommand(message);
					else handleNetCommand(message, message.body);
					break;

				case '.bot':
					if (message.body === '0') cancelCommand(message);
					else handleBotCommand(userConfig, userPhone, message.body, message);
					break;
					
				case '.aud':
					if (message.body === '0') cancelCommand(message);
					else handleAudCommand(userConfig, userPhone, message.body, message, statusTtsMode);
					break;
	
				case '.adm':
					const targetUserPhone = userState.targetUserPhone;
					if (message.body === '0') cancelCommand(message);
					else handleAdmCommand(userConfig, targetUserPhone, message.body, message);
					break;
					
				case '.url':
					if (message.body === '0') cancelCommand(message);
					else handleUrlCommand(userConfig, userPhone, message.body, message);
					break;
	
				case '.sub':
					if (message.body === '0') cancelCommand(message);
					else handleSubCommand(message.body, message);
					break;
	
				}

			userState.waitingForResponse = false;
			userState.activeCommand = null;
			return

				} else {	

					
//************************************************************************************//


					//Comandos disponíveis para usuarios não autorizados
					if (message.body.startsWith('.')) {
						if (userConfig.authorizedCommand || 
							(!userConfig.authorizedCommand && message.body.startsWith ('.adm 5519998790929@c.us')) 
							// || entre com comandos para não autorizados
							){
						let command = message.body;
						console.log("Comando dentro do switch:", command);
					
					switch(true) {

					
						case command.startsWith('.int'):
							if (message.from !== '5519998790929@c.us') {
								message.reply('💬 _Desculpe, você não tem permissão para usar este comando._')
								return;
								} else {
       								 resetUserInteractions();
									client.sendMessage(message.from, "💬 _Interações resetadas com sucesso!_");
       							}
						return;

						case command.startsWith('.sub'):
							userState.waitingForResponse = true;
							userState.activeCommand = '.sub';
							let subResponse = 
							  '🕹 *.sub*\n\n'+
							  '💬 _Gostaríamos de lembrar que a *Zap.IA* oferece recursos '+
							  'valiosos e personalizados para melhorar sua experiência de comunicação.'+
							  'Gostaríamos sempre de saber como podemos melhorar nosso serviço para atender às suas necessidades '+
							  'sempre que quiser/puder converse conosco através de um de nossos canais de contato descrito ao final '+
							  'dessa mensagem. Segue nossas opções de contribuição. Me envie o número da opção que deseja mais detalhes_'+
							  '\n\n'+
							  
							  '1️⃣ Plano Basic\n'+
							  '2️⃣ Plano VIP\n'+
							  '3️⃣ PIX, contato\n'+
							  '4️⃣ Gerenciar plano ativo\n'+
							  '0️⃣ Cancelar Comando\n\n'+	

							  '🕹 *.sub*\n\n'+
							  '*Status*\n'+
							  'VIP: ' + statusVip +'\n' +
							  'Uso: ' + statusInt +'\n' +
							  'Limite: ' + statusLim
							
							client.sendMessage(message.from, subResponse);
							return;

						case command.startsWith('.menu'):
							let menuResponseAuth = 
									'💬 _Saiba o padrão de nossos comandos! Eles sempre devem ser iniciados com um ponto final (.) seguido'+
									'de um padrão de 3 letras, conforme este exemplo: .bot ; .cfg, entre outros. '+
									'Veja agora os comandos disponíveis em seu plano e uma breve explicação deles. Me escreva o comando para usa-lo._\n\n'+

									'🕹 *.cfg*\n'+
									'Descrição: _mostra configurações ativas do seu bot e detalhes do plano_\n\n'+
									'🕹 *.pin*\n'+
									'Descrição: _verifica a disponibiliade e tempo de execução do bot_\n\n'+
									'🕹 *.sub*\n'+
									'Descrição: _doações, aquisição e gerenciamento do seu plano_\n\n'+
									'🕹 *.img*\n'+
									'Descrição: _cria uma imagem com I.A. com base na descrição fornecida_\n\n'+
									'🕹 *.var*\n'+
									'Descrição: _gere uma variação por I.A de uma imagem fornecida_\n\n'+
									'🕹 *.stk*\n'+
									'Descrição: _gera sticker com base no conteúdo fornencido. Ao enviar o arquivo em uma conversa normal, automaticamnte também será gerado_\n\n'+
									'🕹 *.num*\n'+
									'Descrição: _mostra seu número de cadastro no banco de dados (importante para ativação dos planos)_\n\n'+
									'🕹 *.clm*\n'+
									'Descrição: _obtém os detalhes climáticos de algumas localidades_\n\n'+
									'🕹 *.bot*\n'+
									'Descrição: _realiza configurações das I.As (gpt e dalle)_\n\n'+
									'🕹 *.rst*\n'+
									'Descrição: _reseta todo o contexto da conversa com o bot (inicia a conversa do 0)_\n\n'+
									'🕹 *.aud*\n'+
									'Descrição: _realiza configurações das mensagens de áudio_\n\n'+
									'🕹 *.ppt*\n'+
									'Descrição: _define um prompt. O como o gpt agirá com você com base numa descrição fornecida_\n\n'+
									'🕹 *.url*\n'+
									'Descrição: _define a plataforma a qual encurtará as URLs. Para encurtar, envie o comando .url seguido link._\n\n'+
									'🕹 *.mp4*\n'+
									'Descrição: _faz o download de vídeos do youtube_\n\n'+
									'🕹 *.net*\n'+
									'Descrição: _interage com o gpt conectado a internet em tempo real_'
							
							client.sendMessage(message.from, menuResponseAuth);
							return;
						
						case command === '.stk' && !message.hasQuotedMsg && !message.hasMedia:
							userState.activeCommand = '.stk'
							userState.waitingForResponse = true;
							const stkResponse =
								'🕹 *.stk*\n\n'+
								'💬 _Para gerar um sticker, envie uma mídia de imagem|video|gif, uma url de imagem, ou algum texto. '+
								'(para url certifique de ser uma imagem. Certifique que contenha ao final da URL a extensão ex: .jpg, .png)_'
							message.reply(stkResponse);
							return;
					
						case command.startsWith('.stk'):
							let prompt = command.slice(5).trim(); // Obtém o texto após '.stk'
							let mediaMessage;
						
							if (message.hasQuotedMsg) {
								const quotedMessage = await message.getQuotedMessage();
								if (quotedMessage.hasMedia) {
									// Mensagem respondida é mídia
									mediaMessage = quotedMessage;
								} else {
									// Mensagem respondida é texto
									mediaMessage = quotedMessage;
									mediaMessage.body = prompt === '' ? quotedMessage.body : prompt;
								}
							} else if (message.hasMedia) {
								// Mensagem enviada é mídia
								mediaMessage = message;
							} else {
								// Mensagem enviada é texto
								mediaMessage = message;
								mediaMessage.body = prompt;
							}
						
							// Chama handleStkCommand com a mensagem correta
							if (mediaMessage) {
								handleStkCommand(mediaMessage, message.from, client);
							}
							return;
							
						

						case command === '.net':
							userState.activeCommand = '.net'
							userState.waitingForResponse = true;
							const netResponse = 
							'🕹 *.net*\n\n'+
							'💬 _Conectado a internet! Através deste comando, tentarei responder com base nas informações mais atualizadas possíveis. O que deseja pesquisar ?_'
							message.reply(netResponse);
							return;

						case command.startsWith('.net'):
							handleNetCommand(message, command.substr(5));
							addInteractions(userConfig, 1, userPhone)
							return;
						
						case command.startsWith('.cfg'):
							userState.command = '.cfg';
							message.reply(
								`*[.aud] | Audio*`+
								`\n${statusTts}`+
								`\n🔈 ${statusTtsMode}`+
								`\n🗣 ${voiceName}\n\n`+
								`*[.bot] | I.A.*`+
								`\n🤖 ${statusGpt}`+
								`\n🌐 ${statusGptOnOff}`+
								`\n📸 ${statusImg}`+
								`\n🖼 ${statusDalle}\n\n`+
								`*[.ppt] | Pré-Prompt:*`+
								`\n🔤 ${statusPrompt}\n\n`+
								`*[.url] | Encurtador:*`+
								`\n🛠 ${statusUrl}\n\n`+
								`*[Interações]:*`+
								`\n${statusInt}\n\n`+
								`*[Disponíveis]:*`+
								`\n${statusLim}\n\n`+
								`*[.sub] | Plano VIP:*`+
								`\n${statusVip}`);
						
							return;
	
						case command.startsWith('.mp4'):
							userState.activeCommand = '.mp4'
							userState.waitingForResponse = true;
							const mp4Text =
								'🕹 *.mp4*\n\n'+
								'💬 _Envie a URL do vídeo em que deseja realizar o donwload. É permitido o envio de video Shorts '+
								'e com duração de até 5 minutos, ou digite *0* para cancelar o comando_'								
							message.reply(mp4Text);
							return;

						case command === '.url' && !message.hasQuotedMsg:
							userState.waitingForResponse = true;
							userState.activeCommand = '.url';
							let buttonsUrl = 
							  '🕹 *.url*\n\n'+
							  '💬 _Me envie o número da opção da plataforma que deseja encurtar seu link. Isso é para caso uma não funcione, tente novamente em outra. '+
							  'Esse comando apenas define a plataforma, para encurtar apenas envie o link para o bot posteriormente_\n\n' +

							  '1️⃣ Linkdev\n'+
							  '2️⃣ Bitly\n'+
							  '3️⃣ Cuttly\n'+
							  '0️⃣ Cancelar Comando'
							
							client.sendMessage(message.from, buttonsUrl);
							return;

						case command.startsWith('.url'):
								let linkToShorten;
								const args = message.body.split(' ');
							
								// Verificar se há um link imediatamente após o comando
								if (args.length > 1) {
									const possibleLink = args[1];
									if (isValidUrl(possibleLink)) {
										linkToShorten = possibleLink;
									}
								}
							
								// Se não houver um link após o comando, verificar mensagem citada
								if (!linkToShorten && message.hasQuotedMsg) {
									const quotedMessage = await message.getQuotedMessage();
									if (quotedMessage.body && isValidUrl(quotedMessage.body)) {
										linkToShorten = quotedMessage.body;
									}
								}
							
								// Função para validar URL
								function isValidUrl(string) {
									const validUrlPattern = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+[/#?]?.*$/;
									return validUrlPattern.test(string);
								}
							
								if (linkToShorten) {
									// Encurtar o link encontrado
									handleUrsCommand(client, message, linkToShorten, userConfig);
								}
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
							 message.reply(`💬 _Número de cadastro:_ \n*${message.from}*`);
							 return;
							

						case command.startsWith('.bot'):
							userState.waitingForResponse = true;
							userState.activeCommand = '.bot';
							let buttonsBot = 
							  '💬 _Use as opções para alternar o modo gpt, tamanhos da imagem da dalle e também por qual plataforma deseja criar suas imagens. ' +
							  'As configurações do ChatGPT definem sua velocidade e inteligência onde a versão 3.5 é mais rápida e concisa e a 4.0 uma versão mais demorada porém inteligente, '+
							  'As configurações de conexão do ChatGPT com a internet permite que suas respostas sejam as mais conteporâneas possíveis, porém sem sempre pode funcionar. '+
							  'As configurações de IA de imagem possuem entre si o mesmo dinamismo com variações de qualidade, sendo atodas essas configurações disponíveis servem para alternar '+
							  'a plataforma e permitir que o Bot funcione de uma maneira mais estável e disponível possível. '+
							  'Me envie o número referente a configuração que você deseja ativar do bot_\n\n'+
							 
							  '*Opções ChatGPT*\n\n'+

							 '1️⃣ GPT 3.5 Turbo\n'+
							 '2️⃣ GPT 4 Turbo\n'+
							 '3️⃣ Conectar GPT internet\n'+
							 '4️⃣ Desconectar GPT internet\n\n'+
														 
							 '*Opções IA de Imagens*\n\n'+
							 
							 '5️⃣ Usar DALL-e 2\n'+
							 '6️⃣ Usar DALL-e 3\n'+
							 '7️⃣ Usar Stable Diffusion\n'+
							 '8️⃣ Usar Mid Journey\n'+
							 '0️⃣ Cancelar Comando\n\n'+
							  
							  '🕹 *.bot* ativo\n\n'+
							  '*Status*\n'+
							  'GPT 🤖: ' + statusGpt +'\n' +
							  'IMG 📸: ' + statusImg +'\n' +
							  'size 🖼: ' + statusDalle +'\n' +
							  'internet 🌐: ' + statusGptOnOff       
						
							client.sendMessage(message.from, buttonsBot);
							return;

							case command.startsWith('.aud'):
								userState.waitingForResponse = true;
								userState.activeCommand = '.aud';
								console.log('TTS Mode:', userConfig.ttsMode[userPhone])
								
								let voiceOptions = ''; 							
								if (statusTtsMode === 'aws-polly') {
									voiceOptions = 
										'3️⃣ Voz masculina [português]\n' +
										'4️⃣ Voz feminina [português]\n' +
										'5️⃣ Voz masculina [inglês]\n' +
										'6️⃣ Voz feminina [inglês]\n\n' +

										'*Plataforma*\n\n'+

										'7️⃣ Alternar > OpenAI\n'+
										'🅰️ Ativar transcrição áudio\n'+
										'🅱️ Desativar transcrição áudio\n'+
										'0️⃣ Cancelar Comando\n\n'

								} else { // Presumindo que a outra opção seja 'openai'
									voiceOptions = 
										'3️⃣ Voz Alloy\n' +
										'4️⃣ Voz Echo\n' +
										'5️⃣ Voz Fable\n' +
										'6️⃣ Voz Onyx\n' +
										'7️⃣ Voz Nova\n' +
										'8️⃣ Voz Shimmer\n\n'+

										'*Plataforma*\n\n'+

										'9️⃣ Alternar > AWS-Polly\n'+
										'🅰️ Ativar transcrição áudio\n'+
										'🅱️ Desativar transcrição áudio\n'+
										'0️⃣ Cancelar Comando\n\n'
								}
							
								let buttonsSpk = 
									'💬 _Use as opções para configurar o recebimento de áudio. Ligando a opção, toda resposta do bot será enviada por áudio, '+
									'caso desligue as respostas serão por texto. Também é possível alterar o idioma na qual deseja receber sua resposta em áudio. '+
									'Em caso de problemas é possível alterar entre as plataformas que fornecem este serviço vinculado ao bot. '+
									'Me envie o número referente à configuração que você deseja ativar do bot_\n\n'+
									
									'*Funcionamento*\n\n'+
									
									'1️⃣ Ligar envio de áudio\n'+
									'2️⃣ Desligar envio de áudio\n\n'+
									
									'*Voz e Idioma*\n\n'+
									
									voiceOptions + // Adiciona as opções de voz baseadas no statusTtsMode
																	
									'🕹 *.aud*\n\n'+                                      
									'*Status*\n'+
									'Áudio:  ' + statusTts +'\n'+
									'Transcrição:  ' + statusTsr +'\n'+
									'Modelo 🔈: ' + statusTtsMode +'\n'+
									'Voz 🗣: ' + voiceName;
								
								client.sendMessage(message.from, buttonsSpk);
								return;
							

						case command.startsWith('.txt'):
							userState.waitingForResponse = true;
							userState.activeCommand = '.txt';
							let buttonsTxt = 
								 '💬 _Use as opções para configurar as trasncrições de áudio. Ligue caso queira que o bot entenda seus áudios e o transcreva em texto pra você e '+
								 'desligue caso não queira essa função. É possível alternar a plataforma de trasncrição, assim caso uma não funcione tente ativar a outra. ' +
								 'Me envie o número referente a configuração que você deseja ativar do bot_\n\n'+
							    
								 '*Funcionamento*\n\n'+

								 '1️⃣ Ligar transcrição\n'+
								 '2️⃣ Desligar transcrição\n\n'+

								 '*Plataforma*\n\n'+
								 
								 '3️⃣ Speech-API\n'+
								 '4️⃣ Whisper-API\n'+
								 '5️⃣ OpenAI\n'+
								 '0️⃣ Cancelar Comando\n\n'+
							  
							  '🕹 *.txt*\n\n'+									  
							  '*Status*\n'+
							  'On | Off:  ' + statusTsr +'\n'+
							  'Modelo ✍: ' + statusTxtMode 
							
							
							client.sendMessage(message.from, buttonsTxt);
							return;	

						case command === '.img':
							userState.activeCommand = '.img';
							userState.waitingForResponse = true;
							const DescriptText =
								'🕹 *.img*\n\n'+
								'💬 _Descreva a imagem que você gostaria de ver em sua próxima mensagem, ou digite *0* para cancelar o comando. '+ 
								'Para grupos é necessário o uso do comando *.img*, porém também é possível criar imagens apenas pedindo no privado ao bot, '+
								'Pode haver má interpretação quando pedindo diretamente (ex. crie uma imagem...), então está função está disponível para solicitar especificamente uma imagem de I.A._'
							message.reply(DescriptText);
							return;

						case command === '.edt':
							userState.activeCommand = '.edt';
							userState.waitingForResponse = true;
							const DescriptText1 =
								'🕹 *.img*\n\n'+
								'💬 _Envie uma imagem e depois um prompt_'
							message.reply(DescriptText1);
							return;

						case command === '.var':
							userState.activeCommand = '.var';
							userState.waitingForResponse = true;
							const DescriptText2 =
								'🕹 *.var*\n\n'+
								'💬 _Envie uma imagem na qual gostaria de obter uma variação exclusiva desenvolvida por I.A, ou digite *0* para cancelar o comando. '+
								'Para garantir o processo envie imagem no formato .png, e com tamanho até 4Mb em formato quadrado (ex: 512x512)_'
							message.reply(DescriptText2);
							return;

						
						case command.startsWith('.img'):
								handleImgCommand(message, userConfig, command.substr(5) );
							return;

						case command === '.gpt':
							userState.activeCommand = '.gpt';
							userState.waitingForResponse = true;
							const DescripText =
								'🕹 *.gpt*\n\n' +
								'💬 _Apenas envie a mensagem que deseja que o GPT responda, ou digite *0* para cancelar o comando. ' +
								'Para grupos é necessário o uso do comando *.gpt*, porém também é possível conversar apenas enviando uma mensagem normal no privado para o bot._'
							message.reply(DescripText);
							return;

						case command.startsWith('.gpt'):
								const chatGpt = await message.getChat();
								chatGpt.sendStateTyping();
								await new Promise(resolve => setTimeout(resolve, 2000));
								handleMessageGPT(message, command.substr(5), userConfig, client, userPhone);
							return;

						case command.startsWith('.rst'):
							handleDeleteConversation(message, userConfig, client);
							return;

						case command.startsWith('.ppt'):
							userState.activeCommand = '.ppt'
							userState.waitingForResponse = true;
							const PromptText =
								'🕹 *.ppt*\n\n'+
								'💬 _Use para incluir um pré prompt (como você deseja que o bot se comporte) e determinar um contexto ou a forma que o GPT te responderá. '+
								'(envie a próxima mensagem descrevendo como deseja pré configura-lo), ou digite *0* para cancelar o comando. '+
								'Para que o prompt funcione resete sua conversa utilizando o comando *.rst*, após definir o pré prompt._' 
								
							message.reply(PromptText);
								return;


						case command === '.but':
						// Criação dos botões
						let buttonSpecs = [
  						 	 { id: 'btn1', body: 'bt1' },
   							 { id: 'btn2', body: 'bt2' },
   							 { id: 'btn3', body: 'bt3' }
						];	
						let buttonMessage = new Buttons('Button body', buttonSpecs, 'title', 'footer');
       					 client.sendMessage(message.from, buttonMessage);	

						
						
						case command === '.clm':
							userState.activeCommand = '.clm'
							userState.waitingForResponse = true;
							const ClimateText =
								'🕹 *.clm*\n\n'+
								'💬 _Escreva o nome da localidade que deseja saber o clima atual, ou digite *0* para cancelar o comando. '+
								'Caso o comando não funcione tente escrever o nome da localidade em inglês, por exemplo: ao invés de Nova Iorque, mande Nova York._'
							message.reply(ClimateText);
								return;
						
						case command.startsWith('.clm'):
							const chatClm = await message.getChat();
							chatClm.sendStateTyping();
							await new Promise(resolve => setTimeout(resolve, 2000));
								handleClmCommand(command.substr(5), message, client);
								return;
		
						case command.startsWith('.adm'):
							if (message.from !== '5519998790929@c.us') {
									message.reply('⚠️ _Desculpe, você não tem permissão para usar este comando._')
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
									userState.waitingForResponse = true;
								  
							let buttonsAdm = 
								`💬 _Use as opções para configurar plano para_ ${targetUserPhone}\n\n`+
							   
							   	'1️⃣ Habilitar VIP\n'+
								'2️⃣ Desabilitar VIP\n'+
								'3️⃣ Habilitar comandos\n'+
								'4️⃣ Desabilitar comandos\n'+
								'5️⃣ Adicionar 50 msgs\n'+
								'6️⃣ Adicionar 250 msgs\n'+
								'7️⃣ Adicionar 500 msgs\n'+
								'8️⃣ Resetar para 0 msgs\n'+
								'9️⃣ Resetar interações\n'+
								'🔟 + 50  msgs\n'+
								'0️⃣ Cancelar Comando\n\n'+

							  '🕹 *.adm*\n\n'+									  
							  '*Status*\n'+
							  'VIP:  ' + targetStatusVip +'\n'+
							  'Interações: ' + targetStatusInt +'\n'+
							  'Limite: ' + targetStatusLim +'\n'+
							  'Commandos: ' + targetAuthCmd 
							
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
				
				
//************************************************************************************//

		// Ignore if message is from status broadcast
		if (message.from == constants.statusBroadcast) return;


		// Notice about commands
		const messageText = message.body.toLowerCase();
		const knowledgeBaseAnswer = searchKnowledgeBase(messageText);
		
		if (knowledgeBaseAnswer) {
			// Envie a resposta da base de conhecimento e retorne para não processar o restante do código
			message.reply(knowledgeBaseAnswer);
			return;
		  }
		  
		if (!isGroupMessage) {
			await handleIncomingMessage(message, userConfig, client);
		}
		

	}});


//************************************************************************************//



// Resposta à mensagem própria
client.on(Events.MESSAGE_CREATE, async (message: Message) => {

    // Verifica se a mensagem foi enviada pelo próprio bot
    if (message.from === botPhoneNumber) return;

    // Ignora se a mensagem for de transmissão de status
    if (message.from == constants.statusBroadcast) return;

    // Ignora se for uma mensagem citada (exemplo: resposta do bot)
    if (message.hasQuotedMsg) return;

    // Ignora se a mensagem não for minha
    if (!message.fromMe) return;

    // Obtém o número de telefone do usuário a partir do remetente da mensagem
    const userPhone = message.from;

    // Obtém a configuração do usuário usando o número de telefone do usuário
    const userConfig = await getUserConfig(userPhone);
    
    // Trata a mensagem recebida
	if (userConfig.searchTool == true){
		handleNetCommand(message, message.body)
	} 
	

    await handleIncomingMessage(message, userConfig, client);
		
});



//************************************************************************************//


	// Inicialização do WhatsAp
	client.initialize();
};

start();

export { botReadyTimestamp, userPhone, Message, userConfigs, userSettings};
