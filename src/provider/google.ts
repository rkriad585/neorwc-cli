import { config } from "../core/config.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { getModelsByProvider } from "modelpedia";

const MODELPEDIA_PROVIDER = "google";

function defaultContext(): number {
  try {
    const models = getModelsByProvider(MODELPEDIA_PROVIDER);
    const withCtx = models.find((m) => m.context_window);
    if (withCtx?.context_window) return withCtx.context_window;
  } catch {}
  return 1_048_576;
}

function findModelContext(modelName: string): number | undefined {
  const models = getModelsByProvider(MODELPEDIA_PROVIDER);
  const lowerInput = modelName.toLowerCase();
  const exact = models.find((m) => m.id.toLowerCase() === lowerInput);
  if (exact?.context_window) return exact.context_window;
  const prefix = models.find((m) => m.id.toLowerCase().startsWith(lowerInput));
  return prefix?.context_window ?? undefined;
}

class GoogleProvider implements AiProvider {
  readonly name = "google";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext(modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext(), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.GEMINI;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY. Set NEORWC_GEMINI_KEY env var.");
    }

    const url = `${config.GEMINI_API_BASE}/${payload.model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: payload.prompt }] }],
      generationConfig: {
        temperature: payload.options.temperature,
        maxOutputTokens: 524_288,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

export default new GoogleProvider();
