import { config } from "../core/config.ts";
import type { AiProvider, ModelCapabilities, GeneratePayload } from "./types.ts";

class OpenAIProvider implements AiProvider {
  readonly name = "openai";

  async getCapabilities(_modelName: string): Promise<ModelCapabilities> {
    return { maxContext: 128_000, exists: true };
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
