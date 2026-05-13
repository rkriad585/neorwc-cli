// Manages global config (~/.config/neostore/neorwc/config.json)
// API keys + ignore patterns are stored globally (not per-project)

import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { config } from "./config.ts";
import { loadState as loadProjectState, saveState as saveProjectState } from "./state.ts";

export interface GlobalConfig {
  provider?: string;
  model?: string;
  ctx?: number;
  apiKeys?: {
    google?: string;
    openai?: string;
    anthropic?: string;
    deepseek?: string;
    mistral?: string;
    cohere?: string;
  };
  ignorePatterns?: string[];
  lastUpdated?: string;
}

const GLOBAL_CONFIG_PATH = join(config.GLOBAL_PATHS.ROOT, "config.json");

// Load global config from disk
export async function loadGlobalConfig(): Promise<GlobalConfig> {
  try {
    if (existsSync(GLOBAL_CONFIG_PATH)) {
      return JSON.parse(await readFile(GLOBAL_CONFIG_PATH, "utf-8"));
    }
  } catch {
    // ignore read errors
  }
  return {};
}

// Save to global config (merges with existing)
export async function saveGlobalConfig(data: Partial<GlobalConfig>): Promise<void> {
  await mkdir(config.GLOBAL_PATHS.ROOT, { recursive: true });
  const current = await loadGlobalConfig();
  await writeFile(
    GLOBAL_CONFIG_PATH,
    JSON.stringify({ ...current, ...data, lastUpdated: new Date().toISOString() }, null, 2),
    "utf-8",
  );
}

// Merged view: global config (primary) + project state fallback for provider/model/ctx
export interface MergedConfig {
  provider: string;
  model: string;
  ctx: number;
  apiKeys: { google?: string; openai?: string; anthropic?: string; deepseek?: string; mistral?: string; cohere?: string };
  ignorePatterns: string[];
}

// Load and merge: global config first, project state as fallback
export async function loadMergedConfig(): Promise<MergedConfig> {
  const [global, project] = await Promise.all([loadGlobalConfig(), loadProjectState()]);
  return {
    provider: global.provider ?? project.provider ?? "ollama",
    model: global.model ?? project.model ?? config.DEFAULT_MODEL,
    ctx: global.ctx ?? project.ctx ?? 65536,
    apiKeys: global.apiKeys ?? {},
    ignorePatterns: global.ignorePatterns ?? [...config.IGNORE_PATTERNS],
  };
}

// Save TUI edits: everything to global config AND project state
export async function saveTUIConfig(data: {
  provider: string;
  model: string;
  ctx: number;
  googleKey: string;
  openaiKey: string;
  anthropicKey: string;
  deepseekKey: string;
  mistralKey: string;
  cohereKey: string;
  ignorePatterns: string[];
}): Promise<void> {
  await Promise.all([
    saveProjectState({ provider: data.provider, model: data.model, ctx: data.ctx, lastRun: new Date().toISOString() }),
    saveGlobalConfig({
      provider: data.provider,
      model: data.model,
      ctx: data.ctx,
      apiKeys: {
        google: data.googleKey || undefined,
        openai: data.openaiKey || undefined,
        anthropic: data.anthropicKey || undefined,
        deepseek: data.deepseekKey || undefined,
        mistral: data.mistralKey || undefined,
        cohere: data.cohereKey || undefined,
      },
      ignorePatterns: data.ignorePatterns,
    }),
  ]);
}
