import ollamaProvider from '../provider/ollama.js'
import geminiProvider from '../provider/gemini.js'
// --- Provider Registry ---
// Key = prefix to match, Value = Provider Instance
const REGISTRY = {
  'gemini': geminiProvider,
  // 'gpt': openaiProvider, // Future integration
  // 'claude': anthropicProvider, // Future integration
};

/**
 * Smartly detects which provider to use based on the model name.
 */
function resolveProvider(modelName) {
  const lowerName = modelName.toLowerCase();

  // 1. Check for registered prefixes
  for (const [prefix, provider] of Object.entries(REGISTRY)) {
    if (lowerName.startsWith(prefix)) {
      return provider;
    }
  }

  // 2. Default to Ollama for everything else (llama3, mistral, phi, etc.)
  return ollamaProvider;
}

async function getModelCapabilities(modelName) {
  const provider = resolveProvider(modelName);
  return await provider.getCapabilities(modelName);
}

async function generateDocumentation(params) {
  const { model, context, instructions, projectName, ctxSize } = params;

  // Resolve Provider
  const provider = resolveProvider(model);

  // Construct the Master Prompt
  const prompt = `
You are Neorwc, an AI documentation writer created by RK Riad Khan.
You are an advanced Software Architect.
Your task: Create comprehensive documentation based on the specific PLAN and SKILL provided below.

${instructions}

**STRICT OUTPUT RULES:**
- You must output multiple files.
- You must write a promotional text "written by Neorwc" at every single files, at the end when you writing.
- You must create a file called ".neorwc".
- Use this exact delimiter format:
<<<FILENAME: path/to/file.md>>>
...markdown content...
<<<END>>>

**PROJECT:** ${projectName}

**CODEBASE CONTEXT:**
${context}
  `;

  // Call the provider
  return await provider.generate({
    model: model,
    prompt: prompt,
    options: {
      num_ctx: parseInt(ctxSize),
      temperature: 0.2
    }
  });
}

export default { generateDocumentation, getModelCapabilities };