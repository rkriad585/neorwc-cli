#!/usr/bin/env bun

// tip banner — side-effect on import (shows before any CLI output)
import "./src/tips/index.ts";

import { defineCommand, runMain } from "citty";
import { Listr } from "listr2";
import cliSpinners, { randomSpinner } from "cli-spinners";
import { basename, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "./src/core/config.ts";
import { scanProject } from "./src/core/scanner.ts";
import { generateDocumentation, getModelCapabilities } from "./src/core/ai.ts";
import { loadState, saveState } from "./src/core/state.ts";
import { listRemoteTemplates, installTemplate } from "./src/core/templates.ts";
import { openConfigTUI } from "./src/core/config-tui.ts";
import type { ScanResult } from "./src/core/scanner.ts";

// Version: try build-time injection first, then runtime .version file
import { VERSION as BUILD_VER } from "./src/core/__version.ts";

let VERSION = BUILD_VER;

// In source mode (no build injection), read from .version file
if (VERSION === "0.0.0") {
  try {
    VERSION = readFileSync(new URL(".version", import.meta.url), "utf-8").trim().replace(/^v/, "");
  } catch {
    // keep fallback
  }
}

// ─── ANSI color helpers (replaces chalk) ────────────────────────────────────
const C = {
  cyan:    (s: string) => `\x1b[36m${s}\x1b[0m`,
  green:   (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow:  (s: string) => `\x1b[33m${s}\x1b[0m`,
  red:     (s: string) => `\x1b[31m${s}\x1b[0m`,
  gray:    (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold:    (s: string) => `\x1b[1m${s}\x1b[0m`,
  hex:     (_hex: string, s: string) => `\x1b[38;2;${hexToRgb(_hex)}m${s}\x1b[0m`,
};

function hexToRgb(hex: string): string {
  const c = parseInt(hex.replace("#", ""), 16);
  return `${(c >> 16) & 255};${(c >> 8) & 255};${c & 255}`;
}

// ─── Standalone spinner using cli-spinners (replaces ora) ────────────────────
function createSpinner(text: string, useRandom = false) {
  const { frames, interval } = useRandom ? randomSpinner() : cliSpinners.dots;
  let i = 0;
  let timer: Timer | null = null;
  return {
    start() {
      output.write(` ${frames[0]} ${text}`);
      timer = setInterval(() => {
        i = (i + 1) % frames.length;
        output.write(`\r ${frames[i]} ${text}`);
      }, interval);
      return this;
    },
    succeed(msg: string) {
      if (timer) clearInterval(timer);
      output.write(`\r${C.green("\u2713")} ${msg}\n`);
    },
    fail(msg: string) {
      if (timer) clearInterval(timer);
      output.write(`\r${C.red("\u2717")} ${msg}\n`);
    },
    warn(msg: string) {
      if (timer) clearInterval(timer);
      output.write(`\r${C.yellow("\u26A0")} ${msg}\n`);
    },
  };
}

// ─── Confirm prompt (replaces inquirer) ──────────────────────────────────────
async function promptConfirm(message: string, defaultVal = true): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${message} [${defaultVal ? "Y/n" : "y/N"}]: `);
  rl.close();
  const t = answer.trim().toLowerCase();
  if (t === "") return defaultVal;
  return t === "y" || t === "yes";
}

// ─── Context usage bar ───────────────────────────────────────────────────────
function drawUsageBar(tokens: number, limit: number): void {
  const percent = Math.min((tokens / limit) * 100, 100);
  const barLen = 30;
  const filled = Math.round((percent / 100) * barLen);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(barLen - filled);
  let color = C.green;
  if (percent > 70) color = C.yellow;
  if (percent > 90) color = C.red;
  console.log(`  Context Usage: [${color(bar)}] ${tokens}/${limit} tokens`);
}

// ─── Logo ────────────────────────────────────────────────────────────────────
function logLogo(): void {
  console.log(C.hex(config.COLORS.secondary, "Neo Read Write Create\n"));
}

// ─── CLI command definition ──────────────────────────────────────────────────
const main = defineCommand({
  meta: {
    name: "neorwc",
    version: VERSION,
    description: "Neorwc: Documentation Suite",
  },
  args: {
    model:    { type: "string", alias: "m", description: "Ollama model", valueHint: "type" },
    ctx:      { type: "string", alias: "c", description: "Override Context Window (default: auto-detect)", valueHint: "number" },
    skill:    { type: "string", alias: "s", description: "Use a specific persona skill (e.g., technical-writer)", valueHint: "name" },
    init:     { type: "boolean", alias: "n", description: "Initialize ~/.config/neostore/neorwc folder with default templates" },
    templates: { type: "boolean", alias: "t", description: "List available templates from GitHub" },
    install:  { type: "string", alias: "i", description: "Install a template (use \"all\" for everything)", valueHint: "name" },
    list:     { type: "boolean", alias: "l", description: "List installed local resources, List available Global Skills" },
    "dry-run": { type: "boolean", alias: "d", description: "Scan and plan without writing files" },
    provider: { type: "string", alias: "p", description: "Provider (google, openai, ollama)", valueHint: "name" },
    config:   { type: "boolean", alias: "g", description: "Open interactive TUI for editing configuration" },
  },
  async run({ args }) {
    const dryRun = (args as Record<string, unknown>)["dry-run"] as boolean | undefined;

    // --- Standalone flags ---
    if (args.config)     { await openConfigTUI(); return; }
    if (args.templates)  { await listRemoteTemplates(); return; }
    if (args.install)    { await installTemplate(args.install as string); return; }
    if (args.init)       { return await handleInit(); }
    if (args.list)       { return await handleList(); }

    // --- Main flow ---
    const savedState = await loadState();
    const selectedModel = (args.model as string) || savedState.model || config.DEFAULT_MODEL;
    const selectedProvider = args.provider as string | undefined;

    logLogo();
    console.log(C.gray(`  Using Model: ${C.cyan(selectedModel)}${selectedProvider ? C.gray(`  Provider: ${C.cyan(selectedProvider)}`) : ""}`));

    // 1. Fetch model capabilities + scan project
    const phase1 = new Listr<{
      modelCaps: { maxContext: number; exists: boolean };
      scanResult: ScanResult;
    }>([
      {
        title: "Connecting to model",
        task: async (ctx, task) => {
          task.output = `Connecting to ${selectedModel}...`;
          ctx.modelCaps = await getModelCapabilities(selectedModel, selectedProvider);
          if (!ctx.modelCaps.exists) {
            task.output = `Model '${selectedModel}' not found. Make sure to pull it.`;
          }
        },
      },
      {
        title: "Indexing codebase",
        task: async (ctx, task) => {
          task.output = "Scanning project files...";
          ctx.scanResult = await scanProject(process.cwd());
          task.output = `Indexed ${ctx.scanResult.fileCount} files.`;
        },
      },
    ], { rendererOptions: { showTimer: true } });

    const { modelCaps, scanResult } = await phase1.run();

    // Resolve context: flag > saved state > model auto-detect > hard default
    let contextLimit = 65536;
    if (args.ctx)            contextLimit = parseInt(args.ctx as string);
    else if (savedState.ctx) contextLimit = savedState.ctx;
    else                     contextLimit = modelCaps.maxContext;

    console.log(`  ${C.green("\u2713")} Model loaded. Max Context: ${C.bold(String(contextLimit))} tokens.\n`);

    await saveState({ model: selectedModel, ctx: contextLimit, lastRun: new Date().toISOString() });

    drawUsageBar(scanResult.tokenEstimate, contextLimit);

    if (scanResult.tokenEstimate > contextLimit) {
      console.log(C.red(`  \u26A0 Warning: Input exceeds model limit (${contextLimit}). Truncation will occur.`));
    }

    // 2. Resolve instructions: skill + local context
    let combinedInstructions = "";
    const { SKILLS } = config.GLOBAL_PATHS;

    if (args.skill) {
      const skillPath = join(SKILLS, `${args.skill}.md`);
      if (existsSync(skillPath)) {
        combinedInstructions += `\n\n--- ADOPT THIS PERSONA (SKILL) ---\n${await readFile(skillPath, "utf-8")}`;
        console.log(C.hex(config.COLORS.info, `  + Loaded Skill: ${args.skill}`));
      } else {
        console.log(C.red(`  x Skill '${args.skill}' not found in ~/.neorwc/skills`));
      }
    }

    if (existsSync(config.CONTEXT_FILE)) {
      combinedInstructions += `\n\n--- PROJECT SPECIFIC INSTRUCTIONS ---\n${await readFile(config.CONTEXT_FILE, "utf-8")}`;
      console.log(C.green(`  + Loaded Local: ${config.CONTEXT_FILE}`));
    }

    // Fallback prompt for name + description
    let projectName = basename(process.cwd());
    if (!combinedInstructions) {
      const rl = readline.createInterface({ input, output });
      projectName = (await rl.question(`Project Name [${projectName}]: `)) || projectName;
      const desc = await rl.question("Brief Description / Instructions: ");
      rl.close();
      combinedInstructions = desc || "Generate standard documentation.";
    }

    // Confirm
    const proceed = await promptConfirm(
      dryRun ? "Run dry-run analysis?" : "Generate documentation now?",
      true,
    );
    if (!proceed) return;

    // 3. Single-shot generation: call provider once, parse file blocks
    const STATUSES = ["Thinking", "Coocking", "Besting", "Bubling", "Working", "Creating"];
    const phase2 = new Listr<{ summary: string }>([
      {
        title: "Generating documentation",
        task: async (ctx, task) => {
          task.output = `${STATUSES[0]} with ${selectedModel}...`;
          const timer = setInterval(() => {
            task.output = `${STATUSES[Math.floor(Math.random() * STATUSES.length)]}...`;
          }, 1200);
          try {
            ctx.summary = await generateDocumentation({
              model: selectedModel,
              provider: selectedProvider,
              context: scanResult.context,
              instructions: combinedInstructions,
              projectName,
              ctxSize: contextLimit,
              dryRun,
            });
            task.output = "Done";
          } finally {
            clearInterval(timer);
          }
        },
      },
    ], { rendererOptions: { showTimer: true } });

    try {
      const { summary } = await phase2.run();
      console.log(C.gray(`\n  ${summary}`));
      if (!dryRun) {
        console.log(C.green(`\n\u2714 Documentation updated.`));
        console.log(C.gray(`  (Settings saved to docs/.neorwc)`));
      }
    } catch (error) {
      console.log(C.red("\u2717 Error"));
      console.error(C.red((error as Error).message));
    }
  },
});

// ─── Standalone handlers ─────────────────────────────────────────────────────

async function handleInit(): Promise<void> {
  const { ROOT, SKILLS } = config.GLOBAL_PATHS;
  if (existsSync(ROOT)) {
    console.log(C.yellow("\u26A0  Configuration folder already exists at " + ROOT));
    return;
  }

  const spin = createSpinner("Initializing Neorwc with Neorwc-Style Profiles...", true).start();
  await mkdir(SKILLS, { recursive: true });

  await writeFile(
    join(SKILLS, "neorwc-architect.md"),
    `# Skill: Neorwc Senior Architect
**Persona:** You are Neorwc, an AI documentation writer created by RK Riad Khan, acting as a Principal Software Architect.
**Tone:** Highly professional, concise, direct, and technical. No fluff.
**Philosophy:** 
- Prioritize "Helpful, Harmless, and Honest" documentation.
- Focus on Modularity, Scalability, and Security.
- Use MermaidJS diagrams where complex logic exists.
- Write for a Senior Developer audience.
**Format:**
- Use clear headings (e.g.. H1, H2, H3, H4 more).
- Use tables for property definitions.
- Use emoji to make it more beautiful, friendly and better reading experience.
- Explain how to use this project with examples
- Explain about features and functionality's
- Explain about project configuration's
- Explain the Project files/folders Structure with comments
- Explain how to install and use this project
- Always write in clean, descriptive, explainful, and human friendly.
- Always include a "Caveats" or "Edge Cases" section in technical docs.`,
    "utf-8",
  );

  spin.succeed(`Initialized at ${C.bold(ROOT)}`);
  console.log(C.green(`  \u2714 Created Skill: neorwc-architect`));
}

async function handleList(): Promise<void> {
  const { SKILLS } = config.GLOBAL_PATHS;
  console.log(C.hex(config.COLORS.info, "\n\uD83D\uDCC2 Available Global Resources:\n"));

  const printFiles = async (dir: string, type: string) => {
    if (!existsSync(dir)) return console.log(C.gray(`  No ${type} folder found. Run --init`));
    const files = await readdir(dir);
    console.log(C.bold(`  ${type}:`));
    for (const f of files.filter((f) => f.endsWith(".md"))) {
      console.log(`    - ${f.replace(".md", "")}`);
    }
    console.log("");
  };

  await printFiles(SKILLS, "Skills");

  // Show modelpedia provider details: API URLs + model context windows
  const { getProvider, getModelsByProvider } = await import("modelpedia");
  console.log(C.bold("  Model Providers (via modelpedia):\n"));

  for (const name of ["openai", "anthropic", "google"]) {
    const provider = getProvider(name);
    const models = getModelsByProvider(name);
    if (!provider || models.length === 0) continue;

    console.log(`    ${C.bold(provider.name)}`);
    console.log(`      API: ${C.cyan(provider.api_url)}`);
    console.log(`      Models (${models.length} total):`);

    // show first 3 models with context window details
    for (const m of models.slice(0, 3)) {
      const ctx = m.context_window ? `${m.context_window.toLocaleString()} tokens` : "context N/A";
      console.log(`        - ${m.id} (${ctx})`);
    }
    if (models.length > 3) {
      console.log(`        ... and ${models.length - 3} more`);
    }
    console.log("");
  }
}

runMain(main);
