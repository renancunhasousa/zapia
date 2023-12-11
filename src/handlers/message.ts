import {
    handleImgCommand,
    handleClmCommand,
    handleMp4Command,
    handleNetCommand
  } from "../commands";
  import { addInteractions, setPrePrompt, IConfig } from "../config";
  import { handleMessageGPT, handleImageGPT } from "../handlers/gpt";
  import { transcribeOpenAI } from "../providers/openai";
  import { userPhone, botReadyTimestamp } from '../index';
  import * as cli from "../cli/ui";


//************************************************************************************//
  

const knowledgeBase = {
    "comando incorreto": "💬 _Parece que você digitou um comando de forma incorreta. Por favor, verifique a forma que você escreveu e tente novamente. Para ver a lista de comandos disponíveis, digite *.menu* e envie ao bot._",
    // ... outras perguntas e respostas ...
  };

  const validCommands = new Set([
    ".menu", ".gpt", ".img", ".txt", ".stk", ".clm", ".rst",
    ".cfg", ".bot", ".ck", ".aud", ".url", ".urs", ".ppt",
    ".pin", ".sub", ".net", ".adm", ".mp4", ".var", ".but",
    ".up", ".ft"
  ]);
  
  export function searchKnowledgeBase(messageText) {
    if (messageText.startsWith(".") && !validCommands.has(messageText.split(' ')[0])) {
      return knowledgeBase["comando incorreto"];
    }

    const messageWords = new Set(messageText.split(' '));
    for (const [key, value] of Object.entries(knowledgeBase)) {
      const questionWords = new Set(key.split(' '));
      const commonWords = [...questionWords].filter(word => messageWords.has(word)).length;
      if (commonWords / questionWords.size > 0.6) {
        return value;
      }
    }
  
    return null;
  }


//************************************************************************************//



// Função que lida com mensagens recebidas
async function handleIncomingMessage(message: any, userConfig: IConfig, client) {
    const messageText = message.body.toLowerCase();
    const messageType = message.type;
	console.log('Menssagem recebida', messageText);

	// Verifica se o comando requer autorização e se o usuário está autorizado
   if (!userConfig.authorizedCommand && message.body.startsWith('.')) {
	const msg = 
	"💬 _Você não tem permissão suficiente para realizar este comando ao BOT, faça um upgrade de assinatura para habilitar essa função. "+
	"Para mais informações de contribuição e planos envie *.sub* ao bot_"
		client.sendMessage(userPhone, msg)
	return
}


//************************************************************************************//



const weatherKeywords = /^(obtenha clima de|como está o clima em|clima em|tempo em|previsão do tempo em) .+/i;
const setPromptKeywords = /^(defina um prompt de|prompt|pré[- ]prompt|haja como|seja um|seja como).+/i;
const resetPromptKeywords = /^(limpe o prompt|resete o prompt|haja normal|volte ao normal|prompt (limpo|vazio|sem pre[p]rompt)|resete pre[- ]prompt).+/i;
const youtubeVideoKeywords = /^(https?:\/\/)?((www|m)\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com|shorts\.com)\/.+$/i;
const imageKeywords = /^(me (manda|envie|mande|cria|crie) uma (imagem|foto)|crie? (uma )?(imagem|foto|desenho|image)|elabore uma (imagem|foto)|imagine um).+/i;

// Verifica e trata comandos de previsão do tempo
if (weatherKeywords.test(messageText)) {
    const match = messageText.match(weatherKeywords);
    const location = match ? match[2].trim() : '';
    await handleClmCommand(location, message, client);
    return;
}

// Trata os comandos de configuração de prompt
if (setPromptKeywords.test(messageText)) {
    const match = messageText.match(setPromptKeywords);
    const prompt = match ? match[2].trim() : '';
    setPrePrompt(userConfig, prompt, userPhone);
	client.sendMessage(message.from, `Prompt:\n*"${prompt}"*\n\n💬 _Utilize *.rst* ou peça pra resetar o contexto da conversa pro pre prompt funcionar_`);
	return;
}

// Trata os comandos de reset de prompt
if (resetPromptKeywords.test(messageText)) {
	setPrePrompt(userConfig, undefined, userPhone);
	client.sendMessage(message.from, `💬 _Prompt sem pré-configuração_\n\n*<vazio>*`);
	return;
}

// Trata comandos de download de vídeo do YouTube
if (youtubeVideoKeywords.test(messageText)) {
	await handleMp4Command(messageText, message.from, client);
	return;
}

// Resposta para mensagens do tipo documento
if (messageType === 'document') {
    client.sendMessage(message.from, "💬 _Desculpe, ainda não consigo visualizar arquivos. Por favor, envie uma mensagem de texto_");
	return
}
	 
// Trata comandos de criação de imagem
if (imageKeywords.test(message.body)) {
    const prompt = message.body.replace(imageKeywords, "").trim();
	handleImgCommand(message, userConfig, prompt);
	addInteractions(userConfig, 1, userPhone)
	return;
}


//************************************************************************************//


  
// Evita o processamento de mensagens antigas
if (message.timestamp != null) {
    const messageTimestamp = new Date(message.timestamp * 1000);

    // Se botReadyTimestamp for null, o bot ainda não está pronto
    if (botReadyTimestamp == null) {
        client.sendMessage(message.from, "⏱ Iniciando o BOT...");
        cli.print("Ignorando mensagem porque o bot ainda não está pronto: " + message.body);
        return;
    }

    // Ignora mensagens enviadas antes do bot ser iniciado
    if (messageTimestamp < botReadyTimestamp) {
        client.sendMessage(message.from, "⏱ Iniciando o BOT...");
        cli.print("Ignorando mensagem antiga: " + message.body);
        return;
    }
}


//************************************************************************************//


let mediaMessage;
let promptText = message.body; // O texto que acompanha a imagem ou que será enviado se a mensagem for apenas texto.

// Verifica se a mensagem atual é uma resposta a uma mensagem citada.
if (message.hasQuotedMsg) {
    const quotedMessage = await message.getQuotedMessage();

    // Verifica se a mensagem citada tem mídia.
    if (quotedMessage.hasMedia) {
        mediaMessage = await quotedMessage.downloadMedia();
    }

    // Se a mensagem citada for texto ou não houver mídia, você pode querer definir o promptText para o corpo da mensagem citada.
    promptText = quotedMessage.body || promptText;
}

// Verifica se a mensagem atual tem mídia.
if (message.hasMedia && !mediaMessage) {
    mediaMessage = await message.downloadMedia();
}

// Se uma mídia de imagem foi encontrada, processa com o GPT Vision.
if (mediaMessage && mediaMessage.mimetype && mediaMessage.mimetype.startsWith("image/")) {
    await handleImageGPT(message, mediaMessage, userConfig, client, userPhone);
    return
} 




//************************************************************************************//



// caso a mensagem recebida for uma mídica
if (message.hasMedia) {
    const media = await message.downloadMedia();

    // Processamento de imagem
    if (media && media.mimetype.startsWith("image/")) {
        await handleImageGPT(message, media, userConfig, client, userPhone);
        return;
    }
    
	// Ignora mídias que não são áudio
	if (!media || !media.mimetype.startsWith("audio/")) return;

// Converte a mídia para string base64 e cria um arquivo temporário
const mediaBuffer = Buffer.from(media.data, "base64");

// Escolhe o método de transcrição com base no modo configurado
cli.print(`[Transcrição] Transcrevendo áudio no modo "${userConfig.transcriptionMode}"...`);

let res;
switch (userConfig.transcriptionMode) {
    case "openai":
        // Transcrição usando a API da OpenAI
        res = await transcribeOpenAI(mediaBuffer, userConfig, userPhone);
        break;
    
    default:
        cli.print(`[Transcrição] Modo de transcrição não suportado: ${userConfig.transcriptionMode}`);
        return; // Encerra a função se o modo de transcrição não for suportado
}

console.log("Resultado da transcrição:", res);

// Extrai o texto transcrito
const { texto: transcribedText } = res || {};

console.log("Texto transcrito:", transcribedText);

// Verifica se a transcrição é nula (erro na transcrição)
if (transcribedText == null) {
    console.log("Transcrição vazia!");
    client.sendMessage(message.from, "💬 _Desculpe, não consegui entender o que você disse._");
    return;
}

// Verifica se a transcrição está vazia (mensagem de voz silenciosa)
if (transcribedText.length === 0) {
    console.log("Transcrição sem caracter!");
    client.sendMessage(message.from, "💬 _Desculpe, não consegui entender o que você disse. Tente alterar a plataforma de transcrição com comando *.txt*, ou aguarde e tente novamente mais tarde._");
    return;
}

// Registra a transcrição
cli.print(`[Transcription] Transcription response: ${transcribedText}`);

// Responde com a transcrição
const reply = `_Você disse_:\n\n` + `💬 ${transcribedText}`;
message.reply(reply);


if (userConfig.searchTool == true){
    handleNetCommand(message, transcribedText)
    addInteractions(userConfig, 1, userPhone)
return
}
// Processa a mensagem com GPT
await handleMessageGPT(message, transcribedText, userConfig, client, userPhone);

		// Sugere ativar a resposta em áudio, se estiver desativada
		if(!userConfig.ttsEnabled)
		 client.sendMessage(message.from, '```use o comando .aud para conversar por áudio```')
		return;
	}

    await handleMessageGPT(message, message.body, userConfig, client, userPhone);
    return;
    
}

export { handleIncomingMessage };
