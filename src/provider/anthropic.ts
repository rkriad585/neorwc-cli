import { config } from "../core/config.ts";
import { loadGlobalConfig } from "../core/config-manager.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { defaultContext, findModelContext, fetchWithTimeout } from "./shared.ts";

const MAX_OUTPUT_TOKENS = 65_536;

class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext("anthropic", modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext("anthropic", 200_000), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.ANTHROPIC ?? (await loadGlobalConfig()).apiKeys?.anthropic ?? null;
    if (!apiKey) {
      throw new Error("Missing Anthropic API key. Set ANTHROPIC_API_KEY env var or save it via `neorwc --config`.");
    }

    const body = {
      model: payload.model,
      max_tokens: Math.min(payload.options.num_ctx, MAX_OUTPUT_TOKENS),
      messages: [{ role: "user" as const, content: payload.prompt }],
      temperature: payload.options.temperature,
    };

    const response = await fetchWithTimeout(config.ANTHROPIC_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API Error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as {
      content?: { text?: string }[];
    };

    return data.content?.[0]?.text ?? "";
  }
}

export default new AnthropicProvider();
