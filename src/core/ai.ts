import ollamaProvider from "../provider/ollama.ts";
import googleProvider from "../provider/google.ts";
import openaiProvider from "../provider/openai.ts";
import type { AiProvider, ModelCapabilities } from "../provider/types.ts";
import { join, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { config } from "./config.ts";

// provider registry: prefix → provider
const REGISTRY: Record<string, AiProvider> = {
  gemini: googleProvider,
  "gpt-": openaiProvider,
  o1: openaiProvider,
  o3: openaiProvider,
};

const PROVIDER_BY_NAME: Record<string, AiProvider> = {
  google: googleProvider,
  openai: openaiProvider,
  ollama: ollamaProvider,
};

// resolve which provider to use — explicit name takes priority, else model prefix
function resolveProvider(modelName: string, explicitProvider?: string): AiProvider {
  if (explicitProvider) {
    return PROVIDER_BY_NAME[explicitProvider.toLowerCase()] ?? ollamaProvider;
  }
  const lower = modelName.toLowerCase();
  for (const [prefix, provider] of Object.entries(REGISTRY)) {
    if (lower.startsWith(prefix)) return provider;
  }
  return ollamaProvider;
}

export async function getModelCapabilities(
  modelName: string,
  provider?: string
): Promise<ModelCapabilities> {
  return resolveProvider(modelName, provider).getCapabilities(modelName);
}

export interface GenerateParams {
  model: string;
  provider?: string;
  context: string;
  instructions: string;
  projectName: string;
  ctxSize: number;
  dryRun?: boolean;
}

// parse documentation text into <<<FILENAME:>>> blocks and write files
async function parseAndWriteFiles(
  text: string,
  rootDir: string,
  dryRun: boolean
): Promise<string[]> {
  const fileRegex = /<<<FILENAME:\s*(.+?)>>>([\s\S]*?)<<<END>>>/g;
  const createdFiles: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = fileRegex.exec(text)) !== null) {
    let relativePath = match[1].trim();
    const content = match[2].trim();

    if (!relativePath.startsWith(config.DOCS_DIR_ROOT)) {
      relativePath = join(config.DOCS_DIR_ROOT, relativePath);
    }

    if (dryRun) {
      createdFiles.push(`[DRY-RUN] ${relativePath}`);
      continue;
    }

    const fullPath = join(rootDir, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
    createdFiles.push(relativePath);
  }

  return createdFiles;
}

// single-shot generation: calls the provider once, parses file blocks from the response
export async function generateDocumentation(
  params: GenerateParams
): Promise<string> {
  const provider = resolveProvider(params.model, params.provider);
  const dryRun = params.dryRun ?? false;

  const prompt = `You are Neorwc, an AI documentation writer.
Project: ${params.projectName}
Instructions: ${params.instructions}

Project Context:
${params.context}

Write documentation files to the docs/ folder.
Use this format for each file:

<<<FILENAME: path/to/file.md>>>
file content here
<<<END>>>

End every file with the line "written by Neorwc".`;

  const response = await provider.generate({
    model: params.model,
    prompt,
    options: {
      num_ctx: params.ctxSize,
      temperature: 0.2,
    },
  });

  const files = await parseAndWriteFiles(response, process.cwd(), dryRun);

  if (files.length === 0) return "No documentation files were generated.";
  return `Wrote ${files.length} file(s): ${files.join(", ")}`;
}
