import type { ToolCall } from "../tools/types.ts";
import { buildToolDescriptions, findTool } from "../tools/registry.ts";
import ollamaProvider from "../provider/ollama.ts";
import geminiProvider from "../provider/gemini.ts";
import type { AiProvider } from "../provider/types.ts";
import { join, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { config } from "./config.ts";

// provider registry: same as ai.ts
const REGISTRY: Record<string, AiProvider> = {
  gemini: geminiProvider,
};

function resolveProvider(modelName: string): AiProvider {
  const lower = modelName.toLowerCase();
  for (const [prefix, provider] of Object.entries(REGISTRY)) {
    if (lower.startsWith(prefix)) return provider;
  }
  return ollamaProvider;
}

// parse a tool call from the AI response text
// format: TOOL_CALL: <name>\nARGS: <JSON>
// returns null if no tool call is found
function parseToolCall(text: string): ToolCall | null {
  const match = text.match(/^TOOL_CALL:\s*(\S+)\s*\nARGS:\s*(\{[\s\S]*?\})/m);
  if (!match) return null;

  try {
    return {
      name: match[1],
      args: JSON.parse(match[2]) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

// fallback: parse documentation text into <<<FILENAME:>>> blocks and write files
// this catches cases where the AI outputs docs directly instead of using write_files
async function parseAndWriteFallback(
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

// check if text contains documentation-like content (headings, markdown)
function looksLikeDocumentation(text: string): boolean {
  // count markdown headings — more than 3 suggests documentation content
  const headingCount = (text.match(/^#{1,4}\s/m) || []).length;
  return headingCount > 3;
}

// build the system prompt that tells the AI about available tools
function buildSystemPrompt(
  instructions: string,
  projectName: string,
  context: string,
  dryRun: boolean
): string {
  return `You are Neorwc, an AI documentation writer created by RK Riad Khan.
You are an advanced Software Architect.
Your task: Create comprehensive documentation for the project "${projectName}".

${instructions}

**PROJECT CONTEXT (file list + contents):**
${context}

${dryRun ? "**DRY RUN MODE:** Tools will simulate writes without saving files.\n" : ""}

**AVAILABLE TOOLS:**
${buildToolDescriptions()}

**TOOL CALL FORMAT (one tool per message):**
TOOL_CALL: <tool_name>
ARGS: {"key": "value", ...}

**CRITICAL RULES — You MUST follow these:**

1. Your FIRST response must be a tool call — explore with project_tree or read_files never output documentation text immediately.

2. The ONLY way to save documentation files is by calling the write_files tool. NEVER output documentation text directly as your response.

3. You must call write_files at least once before finishing. Each call can write multiple files.

4. When writing files with write_files, use this format:
   ARGS: {"files": [{"path": "docs/index.md", "content": "# Title\\n\\nContent..."}, ...]}

5. Every file must end with the line "written by Neorwc".

6. After you have written all files, output a SHORT completion summary (1-2 sentences only). Do NOT include documentation content in your final message.

7. Do NOT include TOOL_CALL: inside markdown code blocks — only at the top level.

**EXAMPLE WORKFLOW:**
1. TOOL_CALL: project_tree → you see the project structure
2. TOOL_CALL: read_files → you read key files for details
3. TOOL_CALL: write_files → you save documentation to docs/
4. Final message: "Created 3 documentation files covering architecture and API."`;
}

// maximum iterations for the agent loop
const MAX_ITERATIONS = 30;

// the agent loop: sends prompts, parses tool calls, executes tools, repeats
export async function agentLoop(params: {
  model: string;
  instructions: string;
  projectName: string;
  context: string;
  ctxSize: number;
  dryRun?: boolean;
}): Promise<string> {
  const provider = resolveProvider(params.model);
  const dryRun = params.dryRun ?? false;
  const systemPrompt = buildSystemPrompt(
    params.instructions,
    params.projectName,
    params.context,
    dryRun
  );

  // track whether write_files has been called at least once
  let filesWrittenViaTool = false;
  let conversation = systemPrompt;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await provider.generate({
      model: params.model,
      prompt: conversation,
      options: {
        num_ctx: params.ctxSize,
        temperature: 0.2,
      },
    });

    const toolCall = parseToolCall(response);

    if (toolCall) {
      // found a tool call — execute it
      const tool = findTool(toolCall.name);
      if (!tool) {
        conversation += `\n\n${response}\n\nTOOL_RESULT: ${toolCall.name}\nERROR: Unknown tool "${toolCall.name}". Available: ${buildToolDescriptions()}`;
        continue;
      }

      if (toolCall.name === "write_files") {
        filesWrittenViaTool = true;
      }

      const result = await tool.execute(toolCall.args, dryRun);
      conversation += `\n\n${response}\n\nTOOL_RESULT: ${toolCall.name}\n${result}`;
      continue;
    }

    // no tool call — AI wants to finish
    if (!filesWrittenViaTool) {
      // try fallback: parse <<<FILENAME:>>> blocks from the response
      const fallbackFiles = await parseAndWriteFallback(
        response,
        process.cwd(),
        dryRun
      );

      if (fallbackFiles.length > 0) {
        // fallback succeeded — files were written
        return `Agent completed in ${iteration + 1} iteration(s) (fallback mode).\nWrote ${fallbackFiles.length} file(s): ${fallbackFiles.join(", ")}`;
      }

      // no fallback either — nudge the AI
      const nudge = looksLikeDocumentation(response)
        ? "ERROR: You output documentation text directly instead of using write_files. Documentation files are ONLY saved when you call the write_files tool. Do NOT output documentation text. Call write_files now."
        : "You have not written any documentation files yet. You MUST call write_files to save documentation to disk.";
      conversation += `\n\n${response}\n\nTOOL_RESULT: system\n${nudge}`;
      continue;
    }

    // files were written — this is a valid completion
    const summary = response.length < 500
      ? response
      : `${response.substring(0, 200)}... (truncated)`;

    return `Agent completed in ${iteration + 1} iteration(s).\n${summary}`;
  }

  return `Reached maximum iterations (${MAX_ITERATIONS}). Agent loop terminated.`;
}
