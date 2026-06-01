import { config } from "../core/config.ts";
import { loadGlobalConfig } from "../core/config-manager.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { defaultContext, findModelContext, fetchWithTimeout } from "./shared.ts";

const MAX_OUTPUT_TOKENS = 16_384;

class CohereProvider implements AiProvider {
  readonly name = "cohere";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext("cohere", modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext("cohere", 128_000), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.COHERE ?? (await loadGlobalConfig()).apiKeys?.cohere ?? null;
    if (!apiKey) {
      throw new Error("Missing Cohere API key. Set COHERE_API_KEY env var or save it via `neorwc --config`.");
    }

    const body = {
      model: payload.model,
      message: payload.prompt,
      max_tokens: Math.min(payload.options.num_ctx, MAX_OUTPUT_TOKENS),
      temperature: payload.options.temperature,
    };

    const response = await fetchWithTimeout(config.COHERE_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Cohere API Error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as {
      message?: { content?: { text?: string }[] };
    };

    return data.message?.content?.[0]?.text ?? "";
  }
}

export default new CohereProvider();
