import { OpenAI } from "langchain/llms/openai";
import { SerpAPI } from "langchain/tools";
import { initializeAgentExecutor } from "langchain/agents";

export default class ProvedorAgenteNavegador {
    // Inicializar ferramentas de navegador. Outras como RequestGetTool podem ser usadas em alternativa ao SerpAPI.
    ferramentas = [
        new SerpAPI()
        // Outras opções de ferramentas podem ser inseridas aqui, como:
        // new RequestsGetTool(),
    ];

    // Configuração do modelo OpenAI com temperatura 0 para maior precisão.
    modelo = new OpenAI({ temperature: 0 });

    /**
     * Realiza uma consulta usando as ferramentas e o modelo configurados.
     * @param {string} consulta - A consulta a ser feita.
     * @returns {Promise<string>} - Retorna o texto resultante da consulta.
     */
    fetch = async (consulta) => {
        const executor = await initializeAgentExecutor(this.ferramentas, this.modelo, "zero-shot-react-description", true);
        const resultado = await executor.call({ input: consulta });

        return resultado.output; // Retorna o texto final em vez de result.output
    };
}
