const AWS = require("aws-sdk");
import { IConfig } from "../config";

/**
 * Converte uma sentença em áudio.
 * @param texto A sentença a ser convertida em áudio.
 * @param userConfig A configuração do usuário.
 * @returns Um buffer de áudio ou null em caso de erro.
 */
async function ttsRequest(texto: string, userConfig: IConfig): Promise<Buffer | null> {
	const polly = new AWS.Polly({
		credentials: new AWS.Credentials(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY),
		region: process.env.AWS_REGION
	});

	const parametros = {
		OutputFormat: "mp3",
		Text: texto,
		Engine: "standard", //ou Neural
		VoiceId: userConfig.awsPollyVoiceId || "Ricardo"
	};

	try {
		const data = await polly.synthesizeSpeech(parametros).promise();
		if (data.AudioStream instanceof Buffer) {
			return data.AudioStream;
		}
		return null;
	} catch (erro) {
		console.error("Ocorreu um erro (solicitação TTS)", erro);
		return null;
	}
}

export { ttsRequest };
