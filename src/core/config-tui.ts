import { intro, outro, note, select, password, text, confirm, cancel, isCancel } from "@clack/prompts";
import { getModelsByProvider } from "modelpedia";
import { loadMergedConfig, saveTUIConfig } from "./config-manager.ts";


const PROVIDERS = ["google", "openai", "anthropic", "deepseek", "mistral", "cohere", "ollama"];

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  cohere: "Cohere",
  ollama: "Ollama (Local)",
};

const PROVIDER_ENV: Record<string, string> = {
  google: "NEORWC_GOOGLE_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  mistral: "MISTRAL_API_KEY",
  cohere: "COHERE_API_KEY",
};

const modelCache = new Map<string, Array<{ id: string; ctx: number }>>();

function getModelsForProvider(provider: string): Array<{ id: string; ctx: number }> {
  const cached = modelCache.get(provider);
  if (cached) return cached;
  try {
    const models = getModelsByProvider(provider) as Array<{ id: string; context_window?: number }>;
    const result = models
      .filter((m) => m.context_window)
      .map((m) => ({ id: m.id, ctx: m.context_window! }))
      .sort((a, b) => b.ctx - a.ctx);
    modelCache.set(provider, result);
    return result;
  } catch {
    return [];
  }
}

export async function openConfigTUI(): Promise<void> {
  const merged = await loadMergedConfig();
  const cfg = {
    provider: merged.provider,
    model: merged.model,
    ctx: merged.ctx,
    googleKey: merged.apiKeys.google ?? "",
    openaiKey: merged.apiKeys.openai ?? "",
    anthropicKey: merged.apiKeys.anthropic ?? "",
    deepseekKey: merged.apiKeys.deepseek ?? "",
    mistralKey: merged.apiKeys.mistral ?? "",
    cohereKey: merged.apiKeys.cohere ?? "",
    ignorePatterns: merged.ignorePatterns,
  };

  intro("neorwc Configuration");

  // ─── Step 1: Provider ───
  const providerOpts = PROVIDERS.map((p) => ({
    value: p,
    label: `${PROVIDER_LABELS[p] ?? p}${p === cfg.provider ? " (current)" : ""}`,
  }));

  const chosenProvider = await select({
    message: "Select AI Provider",
    options: providerOpts,
    initialValue: cfg.provider,
  });

  if (isCancel(chosenProvider)) { cancel("Configuration cancelled."); return; }
  cfg.provider = chosenProvider;

  // ─── Step 2: Model ───
  const models = getModelsForProvider(cfg.provider);

  let chosenModel = cfg.model;
  if (models.length > 0) {
    const modelOpts = models.map((m) => ({
      value: m.id,
      label: `${m.id}  (${m.ctx.toLocaleString()} tokens)${m.id === cfg.model ? " (current)" : ""}`,
    }));

    const picked = await select({
      message: `Select model for ${PROVIDER_LABELS[cfg.provider] ?? cfg.provider}`,
      options: modelOpts,
      ...(models.find((m) => m.id === cfg.model) ? { initialValue: cfg.model } : {}),
    });

    if (isCancel(picked)) { cancel("Configuration cancelled."); return; }
    chosenModel = picked;

    const found = models.find((m) => m.id === picked);
    if (found) cfg.ctx = found.ctx;
  } else {
    note(`No models found in modelpedia for "${cfg.provider}". Using current model: ${cfg.model}`, "Warning");
  }
  cfg.model = chosenModel;

  // ─── Step 3: API Key (skip for ollama) ───
  const keyMap: Record<string, { key: string; setter: (v: string) => void }> = {
    google:   { key: cfg.googleKey,   setter: (v) => { cfg.googleKey = v; } },
    openai:   { key: cfg.openaiKey,   setter: (v) => { cfg.openaiKey = v; } },
    anthropic: { key: cfg.anthropicKey, setter: (v) => { cfg.anthropicKey = v; } },
    deepseek: { key: cfg.deepseekKey, setter: (v) => { cfg.deepseekKey = v; } },
    mistral:  { key: cfg.mistralKey,  setter: (v) => { cfg.mistralKey = v; } },
    cohere:   { key: cfg.cohereKey,   setter: (v) => { cfg.cohereKey = v; } },
  };

  const keyEntry = keyMap[cfg.provider];
  if (keyEntry) {
    const envVar = PROVIDER_ENV[cfg.provider];
    const apiKey = await password({
      message: `${PROVIDER_LABELS[cfg.provider]} API Key (${envVar})`,
      ...(keyEntry.key ? { initialValue: keyEntry.key } : {}),
    });

    if (!isCancel(apiKey)) {
      keyEntry.setter(apiKey as string);
    }
  }

  // ─── Step 4: Ignore Patterns ───
  const patternStr = cfg.ignorePatterns.join(", ");
  const editPatterns = await confirm({
    message: `Edit ignore patterns? (current: ${cfg.ignorePatterns.length} patterns)`,
    initialValue: false,
  });

  if (isCancel(editPatterns)) { cancel("Configuration cancelled."); return; }

  if (editPatterns) {
    const result = await text({
      message: "Ignore patterns (comma-separated, or leave empty for defaults)",
      placeholder: patternStr,
    });

    if (!isCancel(result) && (result as string).trim()) {
      cfg.ignorePatterns = (result as string).split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // ─── Step 5: Preview ───
  const keyEntries = [
    { label: "Google Key", val: cfg.googleKey },
    { label: "OpenAI Key", val: cfg.openaiKey },
    { label: "Anthropic Key", val: cfg.anthropicKey },
    { label: "DeepSeek Key", val: cfg.deepseekKey },
    { label: "Mistral Key", val: cfg.mistralKey },
    { label: "Cohere Key", val: cfg.cohereKey },
  ];
  const keyLines = keyEntries
    .filter((e) => e.val)
    .map((e) => `${e.label}: ****${e.val.slice(-4)}`);
  if (keyLines.length === 0) keyLines.push("(no API keys set)");

  const preview = [
    `Provider: ${cfg.provider}`,
    `Model:    ${cfg.model}`,
    `Context:  ${cfg.ctx.toLocaleString()} tokens`,
    ...keyLines,
    `Ignore:   ${cfg.ignorePatterns.length} patterns`,
  ].join("\n");

  note(preview, "Configuration Preview");

  const shouldSave = await confirm({
    message: "Save this configuration?",
    initialValue: true,
  });

  if (isCancel(shouldSave) || !shouldSave) {
    cancel("Configuration discarded.");
    return;
  }

  // ─── Save ───
  try {
    await saveTUIConfig({
      provider: cfg.provider,
      model: cfg.model,
      ctx: cfg.ctx,
      googleKey: cfg.googleKey,
      openaiKey: cfg.openaiKey,
      anthropicKey: cfg.anthropicKey,
      deepseekKey: cfg.deepseekKey,
      mistralKey: cfg.mistralKey,
      cohereKey: cfg.cohereKey,
      ignorePatterns: cfg.ignorePatterns,
    });
    outro("Configuration saved successfully!");
  } catch (err) {
    cancel(`Error saving config: ${(err as Error).message}`);
  }
}
