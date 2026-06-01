import { config } from "../core/config.ts";
import { loadGlobalConfig } from "../core/config-manager.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { defaultContext, findModelContext, fetchWithTimeout } from "./shared.ts";

const MAX_OUTPUT_TOKENS = 16_384;

class OpenAIProvider implements AiProvider {
  readonly name = "openai";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext("openai", modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext("openai", 128_000), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.OPENAI ?? (await loadGlobalConfig()).apiKeys?.openai ?? null;
    if (!apiKey) {
      throw new Error("Missing OpenAI API key. Set OPENAI_API_KEY env var or save it via `neorwc --config`.");
    }

    const body = {
      model: payload.model,
      messages: [{ role: "user" as const, content: payload.prompt }],
      max_tokens: Math.min(payload.options.num_ctx, MAX_OUTPUT_TOKENS),
      temperature: payload.options.temperature,
    };

    const response = await fetchWithTimeout(config.OPENAI_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    return data.choices?.[0]?.message?.content ?? "";
  }
}

export default new OpenAIProvider();
