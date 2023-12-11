// Imports relacionados ao ambiente e configurações
import dotenv from 'dotenv';
import { userConfigs } from ".";
import process from "process";

// Imports relacionados a bancos de dados
import * as sqlite3 from "sqlite3";
import { open } from "sqlite";


const dbPromise = open({ filename: "configs.db", driver: sqlite3.Database });
(async () => {
	const db = await dbPromise;
	await db.exec(`
	CREATE TABLE IF NOT EXISTS user_configs (
		phone TEXT PRIMARY KEY,
		openAIModel TEXT,
		prePrompt TEXT,
		dalleModel TEXT,
    openaiVoiceId TEXT,
		awsPollyVoiceId TEXT,
		ttsEnabled INTEGER,
		ttsMode TEXT,
		transcriptionEnabled INTEGER,
		transcriptionMode TEXT,
		userInteractions INTEGER,
		authorized INTEGER,
		limitedInteractions INTEGER,
		urlShorten TEXT,
		isFirstTime INTEGER,
		authorizedCommand INTEGER,
		searchTool INTEGER,
		targetUserPhone INTEGER,
    name TEXT,
    awaitingName INTEGER,
    email TEXT,
    awaitingEmail INTEGER
	  );  
	`);
  })();

dotenv.config();

// Interface de Configuração
export interface IConfig {

	openAIModel: string;                    // Modelo do OpenAI
	prePrompt?: string;                     // Pré-prompt (opcional)
	dalleModel: string;                     // Modelo DALL·E
  openaiVoiceId: string;                  // ID da voz openai
	awsPollyVoiceId: string;                // ID da voz AWS Polly
  
	ttsEnabled: boolean;                    // Texto-para-Fala habilitado
	ttsMode: string;                        // Modo Texto-para-Fala
	transcriptionEnabled: boolean;          // Transcrição habilitada
	transcriptionMode: string;  			      // Modo de Transcrição

	userInteractions: number;              // Interações do usuário
	authorized: boolean;                   // Autorizado
	limitedInteractions: number;           // Interações limitadas
	phone?: string;                        // Número de telefone (opcional)
  
	urlShorten: string;                    // Encurtador de URL
	isFirstTime: boolean;                 // Primeira vez
	authorizedCommand: boolean;           // Comando autorizado
	searchTool: boolean;                  // Ferramenta de busca habilitada
	targetUserPhone?: string;             // Número de telefone do usuário-alvo (opcional)

  name:string;
  awaitingName: boolean;
  email:string;
  awaitingEmail: boolean;
  }
  

// Configuração Padrão
const defaultConfig: IConfig = {
	// Configurações do OpenAI
	openAIModel: "gpt-3.5-turbo",
	prePrompt: "",
	dalleModel: "DALLE2",
  openaiVoiceId: "alloy",
	awsPollyVoiceId: "Joanna",
  
	ttsEnabled: false,
	ttsMode: "openai",
  
	transcriptionEnabled: true,
	transcriptionMode: "openai",

	userInteractions: 0,
	authorized: false,
	limitedInteractions: 25,

	urlShorten: "bitly",
	isFirstTime: true,
	authorizedCommand: true,
	searchTool: false,
	targetUserPhone: "",

  name:"",
  awaitingName: false,
  email:"",
  awaitingEmail: false

  };
  

/**
 * Atualiza as configurações do usuário com as configurações atualizadas.
 * @param userPhone O número de telefone do usuário.
 * @param updatedConfig As configurações atualizadas.
 */
function updateUserConfigs(userPhone: string, updatedConfig: IConfig) {
	userConfigs[userPhone] = updatedConfig;
  }




  async function setName(config: IConfig, name: string, userPhone: string) {
    const userConfig = await getUserConfig(userPhone);
    userConfig.name = name;
    await setUserConfig(userPhone, userConfig);
    config.name = name;
    }
    async function setEmail(config: IConfig, email: string, userPhone: string) {
      const userConfig = await getUserConfig(userPhone);
      userConfig.email = email;
      await setUserConfig(userPhone, userConfig);
      config.email = email;
      }


 
  /**
   * Define o modo TTS (Texto-para-Fala) nas configurações.
   * @param config As configurações globais.
   * @param ttsMode O modo TTS a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  async function setTtsMode(config: IConfig, ttsMode: string, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.ttsMode = ttsMode;
	await setUserConfig(userPhone, userConfig);
	config.ttsMode = ttsMode;
  }
  
  /**
   * Define a flag de isFirstTime nas configurações.
   * @param config As configurações globais.
   * @param value O valor da flag isFirstTime a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  async function setFirstTime(config: IConfig, value: boolean, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.isFirstTime = value;
	await setUserConfig(userPhone, userConfig);
	config.isFirstTime = value;
  }
  
  /**
   * Define o modelo GPT nas configurações.
   * @param config As configurações globais.
   * @param value O modelo GPT a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  async function setGptModel(config: IConfig, value: string, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.openAIModel = value;
	await setUserConfig(userPhone, userConfig);
	config.openAIModel = value;
  }
  
  /**
   * Define a flag de searchTool nas configurações.
   * @param config As configurações globais.
   * @param value O valor da flag searchTool a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  async function setSearchTool(config: IConfig, value: boolean, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.searchTool = value;
	await setUserConfig(userPhone, userConfig);
	config.searchTool = value;
  }
  

/**
 * Define o modelo de geração de imagem DALL·E nas configurações.
 * @param config As configurações globais.
 * @param value O modelo DALL·E a ser definido.
 * @param userPhone O número de telefone do usuário.
 */
async function setImgModel(config: IConfig, value: string, userPhone: string) {  
	const userConfig = await getUserConfig(userPhone);
	userConfig.dalleModel = value;
	await setUserConfig(userPhone, userConfig);
	config.dalleModel = value;
  }
  
  /**
   * Define o tamanho do modelo DALL·E nas configurações.
   * @param config As configurações globais.
   * @param value O tamanho do modelo DALL·E a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  
  /**
   * Define o ID da voz TTS (Texto-para-Fala) nas configurações.
   * @param config As configurações globais.
   * @param value O ID da voz TTS a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  async function setTtsVoiceIdAws(config: IConfig, value: string, userPhone: string) {  
	const userConfig = await getUserConfig(userPhone);
	userConfig.awsPollyVoiceId = value;
	await setUserConfig(userPhone, userConfig);
	config.awsPollyVoiceId = value;
  }

  async function setTtsVoiceIdOpenai(config: IConfig, value: string, userPhone: string) {  
    const userConfig = await getUserConfig(userPhone);
    userConfig.openaiVoiceId = value;
    await setUserConfig(userPhone, userConfig);
    config.openaiVoiceId = value;
    }
    

/**
 * Define a flag de transcrição ativada nas configurações.
 * @param config As configurações globais.
 * @param value O valor da flag transcriptionEnabled a ser definido.
 * @param userPhone O número de telefone do usuário.
 */
async function setTranscriptionEnabled(config: IConfig, value: boolean, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.transcriptionEnabled = value;
	await setUserConfig(userPhone, userConfig);
	config.transcriptionEnabled = value;
  }
  
  /**
   * Define o modo de transcrição nas configurações.
   * @param config As configurações globais.
   * @param value O modo de transcrição a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  async function setTranscriptionMode(config: IConfig, value: string, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.transcriptionMode = value;
	await setUserConfig(userPhone, userConfig);
	config.transcriptionMode = value;
  }
  
  /**
   * Define o prePrompt nas configurações.
   * @param config As configurações globais.
   * @param value O valor do prePrompt a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  async function setPrePrompt(config: IConfig, value: undefined, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.prePrompt = value;
	await setUserConfig(userPhone, userConfig);
	config.prePrompt = value;
  }
  
  /**
   * Define a flag de TTS (Texto-para-Fala) ativada nas configurações.
   * @param config As configurações globais.
   * @param value O valor da flag ttsEnabled a ser definido.
   * @param userPhone O número de telefone do usuário.
   */
  async function setTTSEnabled(config: IConfig, value: boolean, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.ttsEnabled = value;
	await setUserConfig(userPhone, userConfig);
	config.ttsEnabled = value;
  }
  
/**
 * Define a autorização de usuário nas configurações.
 * @param config As configurações globais.
 * @param value O valor da autorização de usuário a ser definido.
 * @param targetUserPhone O número de telefone do usuário alvo.
 */
async function authorizedUser(config: IConfig, value: boolean, targetUserPhone: string) {
	const targetUserConfig = await getUserConfig(targetUserPhone);
	targetUserConfig.authorized = value;
	await setUserConfig(targetUserPhone, targetUserConfig);
	config.authorized = value;
	updateUserConfigs(targetUserPhone, targetUserConfig);
  }
  
  /**
   * Define a autorização de comando de usuário nas configurações.
   * @param config As configurações globais.
   * @param value O valor da autorização de comando de usuário a ser definido.
   * @param targetUserPhone O número de telefone do usuário alvo.
   */
  async function authorizedUserCommand(config: IConfig, value: boolean, targetUserPhone: string) {
	const targetUserConfig = await getUserConfig(targetUserPhone);
	targetUserConfig.authorizedCommand = value;
	await setUserConfig(targetUserPhone, targetUserConfig);
	config.authorizedCommand = value;
	updateUserConfigs(targetUserPhone, targetUserConfig);
  }
  
  /**
   * Verifica se um usuário tem autorização de comando.
   * @param phoneNumber O número de telefone do usuário.
   * @param config As configurações globais.
   * @returns True se o usuário tiver autorização de comando, caso contrário, False.
   */
  async function isAuthorizedCommand(phoneNumber: string, config: any): Promise<boolean> {
	const userConfig = await getUserConfig(phoneNumber);
	return userConfig && userConfig.authorizedCommand === true;
  }
  
  /**
   * Verifica se um usuário tem autorização.
   * @param phoneNumber O número de telefone do usuário.
   * @param config As configurações globais.
   * @returns True se o usuário tiver autorização, caso contrário, False.
   */
  async function isAuthorized(phoneNumber: string, config: any): Promise<boolean> {
	const userConfig = await getUserConfig(phoneNumber);
	return userConfig && userConfig.authorized === true;
  }
  
  /**
   * Adiciona interações a um usuário.
   * @param config As configurações globais.
   * @param value O número de interações a serem adicionadas.
   * @param targetUserPhone O número de telefone do usuário alvo.
   */
  async function addInteractions(config: IConfig, value: number, targetUserPhone: string) {
	const targetUserConfig = await getUserConfig(targetUserPhone);
	targetUserConfig.userInteractions += value;
	await setUserConfig(targetUserPhone, targetUserConfig);
	config.userInteractions += value;
	updateUserConfigs(targetUserPhone, targetUserConfig);
  }
  

/**
 * Redefine o número de interações de um usuário para zero.
 * @param config As configurações globais.
 * @param value O número de interações a serem definidas como zero.
 * @param targetUserPhone O número de telefone do usuário alvo.
 */
async function resetInteractions(config: IConfig, value: number, targetUserPhone: string) {
	const targetUserConfig = await getUserConfig(targetUserPhone);
	targetUserConfig.userInteractions = 0;
	await setUserConfig(targetUserPhone, targetUserConfig);
	config.userInteractions = 0;
	updateUserConfigs(targetUserPhone, targetUserConfig);
  }
  
  /**
   * Define o número limitado de interações para um usuário nas configurações.
   * @param config As configurações globais.
   * @param value O número limitado de interações a ser definido.
   * @param targetUserPhone O número de telefone do usuário alvo.
   */
  async function setLimitedInteractions(config: IConfig, value: number, targetUserPhone: string) {
	const targetUserConfig = await getUserConfig(targetUserPhone);
	targetUserConfig.limitedInteractions = value;
	await setUserConfig(targetUserPhone, targetUserConfig);
	config.limitedInteractions = value;
	updateUserConfigs(targetUserPhone, targetUserConfig);
  }
  
  /**
   * Define a URL da plataforma nas configurações.
   * @param config As configurações globais.
   * @param value A URL da plataforma a ser definida.
   * @param userPhone O número de telefone do usuário.
   */
  async function setPlatformUrl(config: IConfig, value: string, userPhone: string) {
	const userConfig = await getUserConfig(userPhone);
	userConfig.urlShorten = value;
	await setUserConfig(userPhone, userConfig);
	config.urlShorten = value;
  }
  

  async function getUserConfig(userPhone: string): Promise<IConfig> {
    const db = await dbPromise;
    const sql = 'SELECT * FROM user_configs WHERE phone = ?';
    const row = await db.get(sql, [userPhone]);

    if (!row) {
        return { ...defaultConfig, phone: userPhone };
    }
    return {
        ...row,
        phone: userPhone,
        ttsEnabled: row.ttsEnabled === 1,
        transcriptionEnabled: row.transcriptionEnabled === 1,
        authorized: row.authorized === 1,
        isFirstTime: row.isFirstTime === 1,
        authorizedCommand: row.authorizedCommand === 1,
        searchTool: row.searchTool === 1,
    };
}
	  
async function setUserConfig(userPhone: string, config: IConfig) {
    const db = await dbPromise;
    const sql = `
        INSERT OR REPLACE INTO user_configs (
            phone, openAIModel, prePrompt, dalleModel, openaiVoiceId,
            awsPollyVoiceId, ttsEnabled, ttsMode, transcriptionEnabled, transcriptionMode,
            userInteractions, authorized, limitedInteractions, urlShorten,
            isFirstTime, authorizedCommand, searchTool, targetUserPhone, 
            name, awaitingName, email, awaitingName
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.run(sql, [
        userPhone, 
        config.openAIModel, 
        config.prePrompt, 
        config.dalleModel,   
        config.openaiVoiceId,
        config.awsPollyVoiceId, 
        config.ttsEnabled ? 1 : 0, 
        config.ttsMode, 
        config.transcriptionEnabled ? 1 : 0, 
        config.transcriptionMode,  
        config.userInteractions, 
        config.authorized ? 1 : 0, 
        config.limitedInteractions, 
        config.urlShorten, 
        config.isFirstTime ? 1 : 0, 
        config.authorizedCommand ? 1 : 0, 
        config.searchTool ? 1 : 0, 
        config.targetUserPhone,
        config.name,
        config.awaitingName,
        config.email,
        config.awaitingEmail
    ]);
}		 
		async function resetUserInteractions() {
			try {
			  const db = await dbPromise;
			  const sql = 'UPDATE user_configs SET userInteractions = 0';
			  await db.run(sql);
			  console.log('Interações do usuário resetadas com sucesso.');
			} catch (err) {
			  console.error('Erro ao resetar interações do usuário:', err);
			}
		  }		  
		  const cron = require('node-cron');
		  cron.schedule('0 0 * * *', resetUserInteractions);
		  
		  
export default defaultConfig;
export { 	
	setTTSEnabled, 
	setTranscriptionEnabled, 
	getUserConfig, 
	setUserConfig, 
	authorizedUser,
	isAuthorized,
	addInteractions,
	resetInteractions,
	setPrePrompt,
	setLimitedInteractions,
	setTtsVoiceIdAws,
  setTtsVoiceIdOpenai,
	setTtsMode,
	setGptModel,
	setPlatformUrl,
	setTranscriptionMode,
	setImgModel,
	setFirstTime,
	authorizedUserCommand,
	isAuthorizedCommand,
	setSearchTool,
	resetUserInteractions,
  setName,
  setEmail	
};