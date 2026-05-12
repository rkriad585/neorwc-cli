import { agentLoop } from "./agent.ts";
import ollamaProvider from "../provider/ollama.ts";
import geminiProvider from "../provider/gemini.ts";
import type { AiProvider, ModelCapabilities } from "../provider/types.ts";

// provider registry: prefix → provider
const REGISTRY: Record<string, AiProvider> = {
  gemini: geminiProvider,
};

// resolve which provider to use based on model name prefix
function resolveProvider(modelName: string): AiProvider {
  const lower = modelName.toLowerCase();
  for (const [prefix, provider] of Object.entries(REGISTRY)) {
    if (lower.startsWith(prefix)) return provider;
  }
  return ollamaProvider;
}

export async function getModelCapabilities(
  modelName: string
): Promise<ModelCapabilities> {
  return resolveProvider(modelName).getCapabilities(modelName);
}

export interface GenerateParams {
  model: string;
  context: string;
  instructions: string;
  projectName: string;
  ctxSize: number;
  dryRun?: boolean;
}

// replaced single-shot generation with agent loop that uses tools
export async function generateDocumentation(
  params: GenerateParams
): Promise<string> {
  return agentLoop({
    model: params.model,
    instructions: params.instructions,
    projectName: params.projectName,
    context: params.context,
    ctxSize: params.ctxSize,
    dryRun: params.dryRun,
  });
}
