import { config } from "../core/config.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";

class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  async getCapabilities(_modelName: string): Promise<ModelCapabilities> {
    return { maxContext: 1_048_576, exists: true };
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

export default new GeminiProvider();
