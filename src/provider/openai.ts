import { config } from "../core/config.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { getModelsByProvider } from "modelpedia";

const MODELPEDIA_PROVIDER = "openai";

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

class OpenAIProvider implements AiProvider {
  readonly name = "openai";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext(modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext(), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.OPENAI;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY. Set OPENAI_API_KEY env var.");
    }

    const body = {
      model: payload.model,
      messages: [{ role: "user" as const, content: payload.prompt }],
      max_tokens: 128_000,
      temperature: payload.options.temperature,
    };

    const response = await fetch(config.OPENAI_API_BASE, {
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
