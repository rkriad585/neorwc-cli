import { config } from "../core/config.ts";
import { loadGlobalConfig } from "../core/config-manager.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { getModelsByProvider } from "modelpedia";

const MODELPEDIA_PROVIDER = "deepseek";

function defaultContext(): number {
  try {
    const models = getModelsByProvider(MODELPEDIA_PROVIDER);
    const withCtx = models.find((m) => m.context_window);
    if (withCtx?.context_window) return withCtx.context_window;
  } catch {}
  return 128_000;
}

function findModelContext(modelName: string): number | undefined {
  const models = getModelsByProvider(MODELPEDIA_PROVIDER);
  const lowerInput = modelName.toLowerCase();
  const exact = models.find((m) => m.id.toLowerCase() === lowerInput);
  if (exact?.context_window) return exact.context_window;
  const prefix = models.find((m) => m.id.toLowerCase().startsWith(lowerInput));
  return prefix?.context_window ?? undefined;
}

class DeepSeekProvider implements AiProvider {
  readonly name = "deepseek";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext(modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext(), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.DEEPSEEK ?? (await loadGlobalConfig()).apiKeys?.deepseek ?? null;
    if (!apiKey) {
      throw new Error("Missing DeepSeek API key. Set DEEPSEEK_API_KEY env var or save it via `neorwc --config`.");
    }

    const body = {
      model: payload.model,
      messages: [{ role: "user" as const, content: payload.prompt }],
      max_tokens: payload.options.num_ctx ?? 8192,
      temperature: payload.options.temperature,
      stream: false,
    };

    const response = await fetch(config.DEEPSEEK_API_BASE, {
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
