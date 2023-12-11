import { intro, spinner, note, outro, text } from "@clack/prompts";
import color from "picocolors";

const s = spinner();

export const print = (text: string) => {
	console.log(color.green("◇") + "  " + text);
};

export const printIntro = () => {
	intro(color.bgCyan(color.white(" ZAPIA₢ no Whatsapp com  ChatGPT & DALL-E ")));
	note("Um bot do WhatsApp que utiliza o ChatGPT e o DALL-E da OpenAI para gerar texto e imagens a partir de um comando.");
	s.start("Iniciando...");
};

export const printQRCode = (qr: string) => {
	s.stop("Client está  pronto!");
	note(qr, "Scaneie o QR code para logar no WhatsApp Web.");
	s.start("Aguardando o QR code ser scaneado");
};

export const printLoading = () => {
	s.stop("Autenticado!");
	s.start("Logging in");
};

export const printAuthenticated = () => {
	s.stop("Sessão iniciada!");
	s.start("Abrindo sessão");
};

export const printAuthenticationFailure = () => {
	s.stop("Falha na autenticação!");
};

export const printOutro = () => {
	s.stop("Carregado!");
	outro("ZAPIA₢ ONLINE!");
};
