import axios from 'axios';
import config from '../core/config.js'; // Make sure config.js is ESM too

class GeminiProvider {
  constructor() {
    this.name = 'gemini';
  }

  /**
   * Gemini has a massive context window (1M - 2M tokens).
   * We return high limits so Neorwc doesn't truncate code.
   */
  async getCapabilities(modelName) {
    // 1.5 Pro/Flash have ~1M-2M context. 
    // We return a safe high number.
    return { 
      maxContext: 1048576, // 1 Million tokens
      exists: true 
    };
  }

  async generate(payload) {
    const apiKey = config.KEYS.GEMINI;

    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY. Export it in your terminal: export GEMINI_API_KEY="your_key"');
    }

    // Construct URL: https://.../models/gemini-1.5-flash:generateContent?key=...
    const url = `${config.GEMINI_API_BASE}/${payload.model}:generateContent?key=${apiKey}`;

    // Gemini API Payload Structure
    const data = {
      contents: [{
        parts: [{ text: payload.prompt }]
      }],
      generationConfig: {
        temperature: payload.options.temperature || 0.2,
        maxOutputTokens: 8192, // Generous output limit for docs
      }
    };

    try {
      const response = await axios.post(url, data, {
        headers: { 'Content-Type': 'application/json' }
      });

      // Parse Gemini Response
      if (response.data && 
          response.data.candidates && 
          response.data.candidates.length > 0 &&
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts) {
            
        return response.data.candidates[0].content.parts[0].text;
      }
      
      return ""; // No text returned
    } catch (error) {
      if (error.response) {
        throw new Error(`Gemini API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}

export default new GeminiProvider();
