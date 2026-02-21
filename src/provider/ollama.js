import axios from 'axios';
import config from '../core/config.js'; // Make sure config.js is ESM too

class OllamaProvider {
  constructor() {
    this.name = 'ollama';
    this.apiGenerate = config.OLLAMA_API;
    this.apiShow = config.OLLAMA_SHOW_API;
  }

  /**
   * dynamically fetches model details to find the specific context window
   */
  async getCapabilities(modelName) {
    try {
      const response = await axios.post(this.apiShow, { name: modelName });
      const info = response.data;
      
      let maxContext = 4096; // Default safe fallback

      // 1. Try to parse from model parameters string (e.g., "num_ctx 8192")
      if (info.parameters) {
        const ctxMatch = info.parameters.match(/num_ctx\s+(\d+)/);
        if (ctxMatch) {
          maxContext = parseInt(ctxMatch[1]);
        }
      } 
      
      // 2. Try to parse from model_info object (newer Ollama versions)
      if (info.model_info && info.model_info['llama.context_length']) {
        maxContext = info.model_info['llama.context_length'];
      }

      return { maxContext, exists: true };
    } catch (error) {
      // If model doesn't exist or API is down
      return { maxContext: 4096, exists: false };
    }
  }

  /**
   * Generates text stream/response
   */
  async generate(payload) {
    try {
      // Ensure strictly required Ollama parameters
      const requestData = {
        model: payload.model,
        prompt: payload.prompt,
        stream: false,
        options: {
          num_ctx: payload.contextLimit,
          temperature: payload.temperature || 0.2,
          stop: ["<<<STOP>>>"] 
        }
      };

      const response = await axios.post(this.apiGenerate, requestData);
      return response.data.response;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please run `ollama serve`.');
      }
      throw error;
    }
  }
}

export default new OllamaProvider();
