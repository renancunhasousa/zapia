import os from "os";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Message, MessageMedia } from "whatsapp-web.js";
import { openaiTTSRequest } from "../providers/openai";
import OpenAI, { ClientOptions } from "openai";
import { addInteractions, IConfig } from "../config";

//************************************************************************************//



// TTS
import { ttsRequest as awsTTSRequest } from "../providers/aws";

// Mapeamento do número para o último ID da conversa
const conversas = {};

// Verifique se a chave da API está definida
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error("A chave da API da OpenAI não está definida.");
}
// Crie um objeto ClientOptions com a chave da API
const openAIOptions: ClientOptions = {
  apiKey: apiKey,
};



//************************************************************************************//



const openai = new OpenAI(openAIOptions);

const handleMessageGPT = async (message: Message, prompt: string, userConfig: IConfig, client, userPhone) => {
  addInteractions(userConfig, 1, userPhone);
  const chat = await message.getChat();
  chat.sendStateTyping();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Delay para simulação de digitação
  
  // Inicia ou recupera o histórico de conversas
  let conversationMessages = conversas[message.from] || [
    { role: "system", content: "Você é um assistente de whatsapp chamado zapia e age e responde de maneira humanizada." }
  ];

  try {
    // Processa pré-prompt se necessário
    if (userConfig.prePrompt && userConfig.prePrompt.trim() !== "") {
      conversationMessages.push({ role: "system", content: userConfig.prePrompt });
      
      const prePromptCompletion = await openai.chat.completions.create({
        model: userConfig.openAIModel || "gpt-3.5-turbo",
        messages: conversationMessages
      });

      const prePromptResponse = prePromptCompletion.choices[0].message.content || "Não consegui entender.";
      conversationMessages.push({ role: "assistant", content: prePromptResponse });
    }

    // Adiciona a mensagem do usuário ao histórico
    conversationMessages.push({ role: "user", content: prompt });

    // Processa a mensagem do usuário
    const completion = await openai.chat.completions.create({
      model: userConfig.openAIModel || "gpt-3.5-turbo",
      messages: conversationMessages,
    });

    const response = completion.choices[0].message.content || "Não consegui entender.";
    conversationMessages.push({ role: "assistant", content: response });
    conversas[message.from] = conversationMessages; // Atualiza o histórico

    // Envia resposta TTS ou texto
    if (userConfig.ttsEnabled && response) {
      sendVoiceMessageReply(message, response, userConfig, client, userPhone);
      client.sendMessage(message.from, 'Use o comando .aud para conversar por texto');
    } else {
      client.sendMessage(message.from, response);
    }
  } catch (error) {
    console.error("Erro:", error);
    message.reply("Erro ao processar a mensagem. Tente novamente mais tarde.");
  }
};


//************************************************************************************//


// Função para deletar a conversa
const handleDeleteConversation = async (message: Message, userConfig: IConfig, client) => {
  delete conversas[message.from];
  client.sendMessage(message.from, "Contexto da conversa redefinido.");
};


//************************************************************************************//


// Função para enviar resposta de voz
async function sendVoiceMessageReply(message: Message, gptTextResponse: string, userConfig: IConfig, client, userPhone) {
  addInteractions(userConfig, 1, userPhone);
  const chat = await message.getChat();
  chat.sendStateRecording();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  var ttsRequest = userConfig.ttsMode === "openai" ? async () => openaiTTSRequest(gptTextResponse, userConfig) : async () => awsTTSRequest(gptTextResponse, userConfig);
  
  const audioBuffer = await ttsRequest();
  if (!audioBuffer || audioBuffer.length === 0) {
    message.reply("Não foi possível gerar o áudio. Tente novamente mais tarde.");
    return;
  }

  const tempFilePath = path.join(os.tmpdir(), randomUUID() + ".opus");
  fs.writeFileSync(tempFilePath, audioBuffer);
  const messageMedia = new MessageMedia("audio/ogg; codecs=opus", audioBuffer.toString("base64"));
  client.sendMessage(message.from, messageMedia);
  fs.unlinkSync(tempFilePath);
}


//************************************************************************************//


async function handleImageGPT(message, media, userConfig, client, userPhone) {
  // Incrementa a contagem de interações do usuário
  addInteractions(userConfig, 5, userPhone);

  // Prepara o chat para digitação
  const chat = await message.getChat();
  chat.sendStateTyping();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simula um delay para processamento
  
  // Log apenas para depuração; pode ser removido em produção
  console.log("Recebendo mídia e corpo da mensagem...");

  // Recupera ou inicia o histórico de conversas
  let conversationMessages = conversas[message.from] || [
    { role: "system", content: "Você é um assistente de whatsapp chamado zapia e age e respode da maneira mais humanizada possível" }
  ];

  // Adiciona a mensagem do usuário ao histórico
  const userPrompt = message.body;
  conversationMessages.push({ role: "user", content: userPrompt });

  // Prepara o cabeçalho e o corpo da requisição
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
  };

  const payload = {
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${media.data}` } }
        ]
      }
    ],
    max_tokens: 300
  };

  // Realiza a requisição à API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  });

  const jsonResponse = await response.json();
  console.log("Resposta da OpenAI:", jsonResponse); // Log para resposta da API

  // Processa a resposta e envia ao usuário
  const visionResponse = jsonResponse.choices[0].message.content || "💬 _Desculpe, não consegui analisar a imagem._";
  client.sendMessage(message.from, visionResponse);

  // Atualiza o histórico de conversas
  conversas[message.from] = conversationMessages;
}



//************************************************************************************//



export { handleMessageGPT, handleDeleteConversation, handleImageGPT };
