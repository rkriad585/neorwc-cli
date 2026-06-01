import { config } from "../core/config.ts";
import { loadGlobalConfig } from "../core/config-manager.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { getModelsByProvider } from "modelpedia";

const MODELPEDIA_PROVIDER = "anthropic";

function defaultContext(): number {
  try {
    const models = getModelsByProvider(MODELPEDIA_PROVIDER);
    const withCtx = models.find((m) => m.context_window);
    if (withCtx?.context_window) return withCtx.context_window;
  } catch {}
  return 200_000;
}

function findModelContext(modelName: string): number | undefined {
  const models = getModelsByProvider(MODELPEDIA_PROVIDER);
  const lowerInput = modelName.toLowerCase();
  const exact = models.find((m) => m.id.toLowerCase() === lowerInput);
  if (exact?.context_window) return exact.context_window;
  const prefix = models.find((m) => m.id.toLowerCase().startsWith(lowerInput));
  return prefix?.context_window ?? undefined;
}

class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext(modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext(), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.ANTHROPIC ?? (await loadGlobalConfig()).apiKeys?.anthropic ?? null;
    if (!apiKey) {
      throw new Error("Missing Anthropic API key. Set ANTHROPIC_API_KEY env var or save it via `neorwc --config`.");
    }

    const body = {
      model: payload.model,
      max_tokens: 8192,
      messages: [{ role: "user" as const, content: payload.prompt }],
      temperature: payload.options.temperature,
    };

    const response = await fetch(config.ANTHROPIC_API_BASE, {
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
