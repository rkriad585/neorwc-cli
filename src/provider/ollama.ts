import { config } from "../core/config.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { fetchWithTimeout } from "./shared.ts";

class OllamaProvider implements AiProvider {
  readonly name = "ollama";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const response = await fetchWithTimeout(config.OLLAMA_SHOW_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) return { maxContext: 4096, exists: false };

      const info = (await response.json()) as {
        parameters?: string;
        model_info?: { "llama.context_length"?: number };
      };

      let maxContext = 4096;
      if (info.parameters) {
        const ctxMatch = info.parameters.match(/num_ctx\s+(\d+)/);
        if (ctxMatch) maxContext = parseInt(ctxMatch[1]);
      }
      if (info.model_info?.["llama.context_length"]) {
        maxContext = info.model_info["llama.context_length"];
      }

      return { maxContext, exists: true };
    } catch {
      return { maxContext: 4096, exists: false };
    }
  }

  async generate(payload: GeneratePayload): Promise<string> {
    let response: Response;
    try {
      response = await fetchWithTimeout(config.OLLAMA_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: payload.model,
          prompt: payload.prompt,
          stream: false,
          options: {
            num_ctx: payload.options.num_ctx,
            temperature: payload.options.temperature,
          },
        }),
      });
    } catch {
      throw new Error("Ollama is not running. Run `ollama serve`.");
    }

    if (!response.ok) {
      throw new Error(`Ollama Error (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response;
  }
}

export default new OllamaProvider();
