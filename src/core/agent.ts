import type { ToolCall } from "../tools/types.ts";
import { buildToolDescriptions, findTool } from "../tools/registry.ts";
import ollamaProvider from "../provider/ollama.ts";
import geminiProvider from "../provider/gemini.ts";
import type { AiProvider } from "../provider/types.ts";

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
// returns null if no tool call is found (meaning final answer)
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

**PROJECT CONTEXT:**
${context}

${dryRun ? "**DRY RUN MODE:** No files will actually be written.\n" : ""}

**AVAILABLE TOOLS:**
${buildToolDescriptions()}

**TOOL CALL FORMAT (one tool per message):**
TOOL_CALL: <tool_name>
ARGS: {"key": "value", ...}

**IMPORTANT RULES:**
- Use tools to explore the codebase and gather information before writing docs.
- Use write_files to create documentation files under docs/.
- You can call multiple tools sequentially — read first, then write.
- When you are done and want to return the final documentation, output your response WITHOUT any TOOL_CALL: line.
- Do NOT include TOOL_CALL: in markdown code blocks or explanations — only at the top level.
- You must write "written by Neorwc" at the end of every file you create.
- Write for a Senior Developer audience — professional, technical, clear.
- Use emoji sparingly and appropriately.`;
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
  const systemPrompt = buildSystemPrompt(
    params.instructions,
    params.projectName,
    params.context,
    params.dryRun ?? false
  );

  // conversation is serialized as a growing string prompt
  let conversation = systemPrompt;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // call the AI with the current conversation
    const response = await provider.generate({
      model: params.model,
      prompt: conversation,
      options: {
        num_ctx: params.ctxSize,
        temperature: 0.2,
      },
    });

    // check if the AI wants to use a tool
    const toolCall = parseToolCall(response);

    if (!toolCall) {
      // no tool call — this is the final answer
      return `Agent completed in ${iteration} iteration(s).\n\n${response}`;
    }

    // find and execute the tool
    const tool = findTool(toolCall.name);
    if (!tool) {
      // unknown tool — tell the AI and let it recover
      conversation += `\n\n${response}\n\nTOOL_RESULT: ${toolCall.name}\nERROR: Unknown tool "${toolCall.name}". Available tools: ${buildToolDescriptions()}`;
      continue;
    }

    const result = await tool.execute(toolCall.args, params.dryRun ?? false);
    conversation += `\n\n${response}\n\nTOOL_RESULT: ${toolCall.name}\n${result}`;
  }

  return `Reached maximum iterations (${MAX_ITERATIONS}). Agent loop terminated.`;
}
