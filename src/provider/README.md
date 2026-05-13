# src/provider/

Implements the `AiProvider` interface (defined in `types.ts`) for each supported AI service.

## Providers

| File | Service |
|------|---------|
| `google.ts` | Google Generative AI (Gemini) |
| `openai.ts` | OpenAI (GPT-4, etc.) |
| `anthropic.ts` | Anthropic (Claude) |
| `deepseek.ts` | DeepSeek |
| `mistral.ts` | Mistral AI |
| `cohere.ts` | Cohere |
| `ollama.ts` | Ollama (local models) |

## Types

`types.ts` defines the `AiProvider` interface and shared types that all providers implement.
