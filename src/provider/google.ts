import { config } from "../core/config.ts";
import { loadGlobalConfig } from "../core/config-manager.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";
import { defaultContext, findModelContext, fetchWithTimeout } from "./shared.ts";

class GoogleProvider implements AiProvider {
  readonly name = "google";

  async getCapabilities(modelName: string): Promise<ModelCapabilities> {
    try {
      const ctx = findModelContext("google", modelName);
      if (ctx) return { maxContext: ctx, exists: true };
    } catch {}
    return { maxContext: defaultContext("google", 1_048_576), exists: false };
  }

  async generate(payload: GeneratePayload): Promise<string> {
    const apiKey = config.KEYS.GOOGLE ?? (await loadGlobalConfig()).apiKeys?.google ?? null;
    if (!apiKey) {
      throw new Error("Missing Google API key. Set NEORWC_GOOGLE_KEY env var or save it via `neorwc --config`.");
    }

    const url = `${config.GEMINI_API_BASE}/${payload.model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: payload.prompt }] }],
      generationConfig: {
        temperature: payload.options.temperature,
        maxOutputTokens: 524_288,
      },
    };

    const response = await fetchWithTimeout(url, {
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
