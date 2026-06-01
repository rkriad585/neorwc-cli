import { config } from "../core/config.ts";
import { loadGlobalConfig } from "../core/config-manager.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { defaultContext, findModelContext, fetchWithTimeout } from "./shared.ts";

const MAX_OUTPUT_TOKENS = 16_384;

class DeepSeekProvider implements AiProvider {
  readonly name = "deepseek";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext("deepseek", modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext("deepseek", 128_000), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.DEEPSEEK ?? (await loadGlobalConfig()).apiKeys?.deepseek ?? null;
    if (!apiKey) {
      throw new Error("Missing DeepSeek API key. Set DEEPSEEK_API_KEY env var or save it via `neorwc --config`.");
    }

    const body = {
      model: payload.model,
      messages: [{ role: "user" as const, content: payload.prompt }],
      max_tokens: Math.min(payload.options.num_ctx, MAX_OUTPUT_TOKENS),
      temperature: payload.options.temperature,
      stream: false,
    };

    const response = await fetchWithTimeout(config.DEEPSEEK_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API Error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    return data.choices?.[0]?.message?.content ?? "";
  }
}

export default new DeepSeekProvider();
