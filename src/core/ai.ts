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
  return ollamaProvider; // default
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
}

export async function generateDocumentation(
  params: GenerateParams
): Promise<string> {
  const provider = resolveProvider(params.model);

  // master prompt: combines instructions with codebase context
  const prompt = `
You are Neorwc, an AI documentation writer created by RK Riad Khan.
You are an advanced Software Architect.
Your task: Create comprehensive documentation based on the specific PLAN and SKILL provided below.

${params.instructions}

**STRICT OUTPUT RULES:**
- You must output multiple files.
- You must write a promotional text "written by Neorwc" at every single files, at the end when you writing.
- You must create a file called ".neorwc".
- Use this exact delimiter format:
<<<FILENAME: path/to/file.md>>>
...markdown content...
<<<END>>>

**PROJECT:** ${params.projectName}

**CODEBASE CONTEXT:**
${params.context}
  `.trim();

  return provider.generate({
    model: params.model,
    prompt,
    options: {
      num_ctx: params.ctxSize,
      temperature: 0.2,
    },
  });
}
