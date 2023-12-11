import { MessageMedia } from "whatsapp-web.js";
import { openai } from "../providers/openai";
import midjourney from "midjourney-client";
import * as cli from "../cli/ui";
import Replicate from "replicate";
import fetch from "node-fetch";
import fs from "fs"
import Jimp from "jimp"
import tmp from 'tmp-promise'
import { addInteractions, IConfig } from "../config";

async function downloadImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
}

const handleMessageDALLevar = async (client, message, media, prompt, userConfig, userPhone) => {
	addInteractions(userConfig, 3, userPhone)
    const chat = await message.getChat();
    chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
        const start = Date.now();
        cli.print(`[DALL-E] Received prompt from ${message.from}: ${prompt}`);
        const chat = await message.getChat();
        chat.sendStateTyping();
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Carregar a imagem, converter para PNG e redimensionar
        const image = await Jimp.read(media);
        const convertedImageBuffer = await image
            .resize(1080, Jimp.AUTO) // Redimensionar para largura de 1080 mantendo a proporção
            .quality(60) // Reduzir a qualidade para diminuir o tamanho do arquivo
            .getBufferAsync(Jimp.MIME_PNG);
        // Criar um arquivo temporário para a imagem convertida
        const { path: convertedImageFilePath, cleanup } = await tmp.file({
        postfix: '.png',
        });

        await fs.promises.writeFile(convertedImageFilePath, convertedImageBuffer);
        const stats = await fs.promises.stat(convertedImageFilePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        if (fileSizeInMB >= 4) {
            throw new Error('O tamanho da imagem é muito grande.');
        }
        const imageResponse = await openai.images.createVariation({
            image: fs.createReadStream(convertedImageFilePath),
        });
        const imageUrl = imageResponse.data[0].url as string;
        const end = Date.now() - start;
        console.log(imageUrl);
        cli.print(`[DALL-E] Edit completed for ${message.from} | OpenAI request took ${end}ms`);
        // Aqui você pode enviar a imagem editada de volta ao usuário
        const imageBase64 = await downloadImageAsBase64(imageUrl);
        const imageToSend = new MessageMedia("image/jpeg", imageBase64, "image.jpg");
        // Remover o arquivo temporário após o uso
        await cleanup();
        client.sendMessage(message.from, imageToSend, { caption: '```by 🖼 DALLE variação```' });
    } catch (error) {
        console.error("An error occurred", error);
        message.reply(
            "💬 _Aguarde um pouco e tente novamente mais tarde, ou contate nossa equipe de suporte._\n\n\t (" + error.message + ")");
    }
};
 
const handleMessageDALLE2 = async (client: any, message: any, prompt: any, userConfig: IConfig, userPhone) => {
	addInteractions(userConfig, 3, userPhone)
	const chat = await message.getChat();
    chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, 2000));
	try {
		const start = Date.now();
		cli.print(`[DALL-E] Received prompt from ${message.from}: ${prompt}`);
		const chat = await message.getChat();
								chat.sendStateTyping();
								await new Promise(resolve => setTimeout(resolve, 2000));
		// Send the prompt to the API
		const imageResponse = await openai.images.generate({
			model: "dall-e-2",
			prompt: prompt,
			n: 1,
			size: "512x512",
			quality: "standard",
			style: "natural"
		});

		const imageUrl = imageResponse.data[0].url as string;
		const end = Date.now() - start;
		cli.print(`[DALL-E] Answer to ${message.from} | OpenAI request took ${end}ms`);

		const imageBase64 = await downloadImageAsBase64(imageUrl);
		const image = new MessageMedia("image/jpeg", imageBase64, "image.jpg");

		client.sendMessage(message.from, image, { caption: '```by 🖼 DALLE 2```' });

	} catch (error: any) {
		console.error("An error occured", error);
		message.reply(
			"💬 _Aguarde um pouco e tente novamente mais tarde, ou contate nossa equipe de suporte._\n\n\t (" + error.message + ")");
	}
};

const handleMessageDALLE3 = async (client: any, message: any, prompt: any, userConfig: IConfig, userPhone) => {
	addInteractions(userConfig, 5, userPhone)
	const chat = await message.getChat();
    chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, 2000));
	try {
		const start = Date.now();
		cli.print(`[DALL-E] Received prompt from ${message.from}: ${prompt}`);
		const chat = await message.getChat();
		chat.sendStateTyping();
		await new Promise(resolve => setTimeout(resolve, 2000));
		// Send the prompt to the API
		const imageResponse = await openai.images.generate({
			model: "dall-e-3",
			prompt: prompt,
			n: 1,
			size: "1024x1024",
			quality: "hd",
			style: "vivid"
		});
		const imageUrl = imageResponse.data[0].url as string;
		const end = Date.now() - start;
		cli.print(`[DALL-E] Answer to ${message.from} | OpenAI request took ${end}ms`);
		const imageBase64 = await downloadImageAsBase64(imageUrl);
		const image = new MessageMedia("image/jpeg", imageBase64, "image.jpg");
		client.sendMessage(message.from, image, { caption: '```by 🖼 DALLE 3```' });

	} catch (error: any) {
		console.error("An error occured", error);
		message.reply(
			"💬 _Aguarde um pouco e tente novamente mais tarde, ou contate nossa equipe de suporte._\n\n\t (" + error.message + ")");
	}
};

const handleMessageStableDiffusion = async (client: any, message: any, prompt: string, userConfig: IConfig, userPhone  ) => {
	addInteractions(userConfig, 3, userPhone)
	const chat = await message.getChat();
    chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, 2000));
	try {
		const start = Date.now();
		cli.print(`[Stable Diffusion] Received prompt from ${message.from}: ${prompt}`);
		const chat = await message.getChat();
		chat.sendStateTyping();
		await new Promise(resolve => setTimeout(resolve, 2000));
	
		// Autenticação e inicialização do cliente Replicate
		const token = process.env.REPLICATE_API_TOKEN;
		if (!token || typeof token !== "string") {
		  throw new Error("REPLICATE_API_TOKEN não está definido.");
		}
		const replicate = new Replicate({ auth: token });
		// Execução do modelo
		const response = await replicate.run(
		  "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
		  { input: { prompt: prompt } }
		);
		const end = Date.now() - start;
		const imageURI = response[0] as string;
		const imageResponse = await fetch(imageURI);
		const arrayBuffer = await imageResponse.arrayBuffer();
		const imageBuffer = Buffer.from(arrayBuffer);
		const image = new MessageMedia("image/jpeg", imageBuffer.toString("base64"), "image.jpg");
		cli.print(`[Stable Diffusion] Answer to ${message.from} | Replicate request took ${end}ms`);
		const caption = {
			caption: '```by 🖼 Stable Diffusion```',
		  };
		client.sendMessage(message.from, image, caption);
	  } catch (error: any) {
		console.error("An error occurred", error);
		message.reply(
		  "💬 _Aguarde um pouco e tente novamente mais tarde, ou contate nossa equipe de suporte._\n\n\t (" + error.message + ")"
		);
	  }
	};

const handleMessageMidJourney = async (client: any, message: any, prompt: string, userConfig: IConfig, userPhone  ) => {
	addInteractions(userConfig, 3, userPhone)
		const chat = await message.getChat();
    	chat.sendStateTyping();
    	await new Promise(resolve => setTimeout(resolve, 2000));
		try {
			const start = Date.now();
			cli.print(`[Mid Journey] Received prompt from ${message.from}: ${prompt}`);
			const chat = await message.getChat();
			chat.sendStateTyping();
			await new Promise(resolve => setTimeout(resolve, 2000));
			// Execução do modelo
			const imageURI = await midjourney(prompt);
			if (!imageURI) {
				throw new Error("No image URL found in the response");
			}
			const end = Date.now() - start;
			const imageResponse = await fetch(imageURI);
			const arrayBuffer = await imageResponse.arrayBuffer();
			const imageBuffer = Buffer.from(arrayBuffer);
			const image = new MessageMedia("image/jpeg", imageBuffer.toString("base64"), "image.jpg");
			cli.print(`[Mid Journey] Answer to ${message.from} | Midjourney request took ${end}ms`);
			const caption = {
				caption: '```by 🖼 Mid Journey```',
			};
			client.sendMessage(message.from, image, caption);
		} catch (error: any) {
			console.error("An error occurred", error);
			message.reply(
				"💬 _Aguarde um pouco e tente novamente mais tarde, ou contate nossa equipe de suporte._\n\n\t (" + error.message + ")"
			);
		}
	};


	async function createVideoFromImage(client, message, imageUrl, userConfig, userPhone) {
	  addInteractions(userConfig, 3, userPhone);
	  const chat = await message.getChat();
	  chat.sendStateTyping();
	  await new Promise(resolve => setTimeout(resolve, 2000));
	
	  try {
		const start = Date.now();
		console.log(`[Stable Video Diffusion] Received image URL from ${message.from}: ${imageUrl}`);
	
		// Autenticação e inicialização do cliente Replicate
		const token = process.env.REPLICATE_API_TOKEN;
		if (!token || typeof token !== "string") {
		  throw new Error("REPLICATE_API_TOKEN não está definido.");
		}
		const replicate = new Replicate({ auth: token });
	
		// Execução do modelo para vídeo
		const response = await replicate.run(
		  "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
		  {
			input: {
			  cond_aug: 0.02,
			  decoding_t: 7,
			  input_image: imageUrl,
			  video_length: "14_frames_with_svd",
			  sizing_strategy: "maintain_aspect_ratio",
			  motion_bucket_id: 127,
			  frames_per_second: 6
			}
		  }
		);
	
		const end = Date.now() - start;
		const videoURI = response[0] as string;
		const videoResponse = await fetch(videoURI);
		const arrayBuffer = await videoResponse.arrayBuffer();
		const videoBuffer = Buffer.from(arrayBuffer);
		const video = new MessageMedia("video/mp4", videoBuffer.toString("base64"), "video.mp4");
	
		console.log(`[Stable Video Diffusion] Answer to ${message.from} | Replicate request took ${end}ms`);
		const caption = {
		  caption: '```by 🎥 Stable Video Diffusion```',
		};
		client.sendMessage(message.from, video, caption);
	  } catch (error) {
		console.error("An error occurred", error);
		message.reply(
		  "💬 _Aguarde um pouco e tente novamente mais tarde, ou contate nossa equipe de suporte._\n\n\t (" + error.message + ")"
		);
	  }
	};
	





	  
	  export { 
				handleMessageDALLE2, 
				handleMessageStableDiffusion, 
				handleMessageMidJourney, 
				handleMessageDALLE3, 
				downloadImageAsBase64, 
				handleMessageDALLevar,
				createVideoFromImage, 
			};