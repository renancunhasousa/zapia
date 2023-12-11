// Importa as dependências necessárias
import { Client } from 'whatsapp-web.js';
import { LocalAuth } from 'whatsapp-web.js';
import constants from './constants';

// Cria uma instância do cliente WhatsApp
const client = new Client({
  puppeteer: {
    args: ["--no-sandbox"]  // Configuração do Puppeteer para evitar o uso do sandbox
  },
  authStrategy: new LocalAuth({
    dataPath: constants.sessionPath  // Caminho para o armazenamento de sessão definido nas constantes
  })
});

// Exporta a instância do cliente para que possa ser usada em outros módulos
export default client;


///usr/bin/google-chrome