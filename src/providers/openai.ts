import fs from "fs";
import path from "path";
import OpenAI, { ClientOptions } from "openai";
import { v4 as uuidv4 } from 'uuid';
import { addInteractions } from "../config";

// Verificar se a chave da API está definida
if (!process.env.OPENAI_API_KEY) {
    throw new Error("A chave da API da OpenAI não está definida.");
}

const openAIOptions: ClientOptions = {
  apiKey: process.env.OPENAI_API_KEY,
};

export const openai = new OpenAI(openAIOptions);

export async function transcribeOpenAI(mediaBuffer, userConfig, userPhone) {
    addInteractions(userConfig, 1, userPhone);
    let tempFileName;

    try {
        tempFileName = path.join(__dirname, `${uuidv4()}.ogg`);
        fs.writeFileSync(tempFileName, mediaBuffer);
        console.log("Arquivo temporário criado:", tempFileName);

        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFileName),
            model: "whisper-1",
        });

        console.log("Resposta da transcrição recebida:", response);

        return {
            texto: response.text || "Transcrição vazia",
        };
    } catch (error) {
        console.error("Erro na transcrição do áudio:", error);
        return { texto: "" };
    } finally {
        if (tempFileName && fs.existsSync(tempFileName)) {
            fs.unlinkSync(tempFileName);
        }
    }
}

export async function openaiTTSRequest(text: string, userConfig: any): Promise<Buffer | null> {
    try {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: userConfig.openaiVoiceId || "alloy",
        input: text,
        response_format: "mp3"
      });
  
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error("Erro ao gerar áudio com OpenAI TTS:", error);
      return null;
    }
}
