// Interface que define os tipos de constantes que serão usadas no aplicativo WhatsApp
interface IConstants {
	// Nome do canal de status de transmissão no WhatsApp
	statusBroadcast: string;

	// Caminho para o armazenamento de sessão no WhatsApp
	sessionPath: string;
}

// Objeto que contém as constantes definidas na interface
const constants: IConstants = {
	statusBroadcast: "status@broadcast",  // Define o nome do canal de status de transmissão
	sessionPath: "./"  // Define o caminho padrão para o armazenamento de sessão
};

// Exporta o objeto de constantes para que ele possa ser usado em outros módulos
export default constants;
