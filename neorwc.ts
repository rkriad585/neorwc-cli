#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import { Listr } from "listr2";
import cliSpinners from "cli-spinners";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "./src/core/config.ts";
import { scanProject } from "./src/core/scanner.ts";
import { generateDocumentation, getModelCapabilities } from "./src/core/ai.ts";
import { parseAndWrite } from "./src/core/writer.ts";
import { loadState, saveState } from "./src/core/state.ts";
import { listRemoteTemplates, installTemplate } from "./src/core/templates.ts";
import type { ScanResult } from "./src/core/scanner.ts";

// ─── ANSI color helpers (replaces chalk) ────────────────────────────────────
const C = {
  cyan:    (s: string) => `\x1b[36m${s}\x1b[0m`,
  green:   (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow:  (s: string) => `\x1b[33m${s}\x1b[0m`,
  red:     (s: string) => `\x1b[31m${s}\x1b[0m`,
  gray:    (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold:    (s: string) => `\x1b[1m${s}\x1b[0m`,
  hex:     (_hex: string, s: string) => `\x1b[38;2;${hexToRgb(_hex)}m${s}\x1b[0m`,
  bgWarn:  (s: string) => `\x1b[43m\x1b[30m${s}\x1b[0m`,
};

function hexToRgb(hex: string): string {
  const c = parseInt(hex.replace("#", ""), 16);
  return `${(c >> 16) & 255};${(c >> 8) & 255};${c & 255}`;
}

// ─── Standalone spinner using cli-spinners (replaces ora) ────────────────────
function createSpinner(text: string) {
  const frames = cliSpinners.dots.frames;
  const interval = cliSpinners.dots.interval;
  let i = 0;
  let timer: Timer | null = null;
  const api = {
    start() {
      output.write(` ${frames[0]} ${text}`);
      timer = setInterval(() => {
        i = (i + 1) % frames.length;
        output.write(`\r ${frames[i]} ${text}`);
      }, interval);
      return api;
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
  return api;
}

// ─── Confirm prompt (replaces inquirer) ──────────────────────────────────────
async function promptConfirm(message: string, defaultVal = true): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const hint = defaultVal ? "Y/n" : "y/N";
  const answer = await rl.question(`${message} [${hint}]: `);
  rl.close();
  const trimmed = answer.trim().toLowerCase();
  if (trimmed === "") return defaultVal;
  return trimmed === "y" || trimmed === "yes";
}

// ─── Context usage bar (green → yellow → red based on fill %) ────────────────
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

// ─── Logo (original uses config.COLORS primary/secondary hex) ────────────────
function printLogo(): void {
  const primary = config.COLORS.primary;   // "#00D8FF"
  const secondary = config.COLORS.secondary; // "#FF0055"
  console.log(C.hex(primary, `
  _   _  ____  ___  ____  __      __  ___
 | \\ | || ===|/ _ \\| ===| \\ \\ /\\ / / / _|
 |_|\\_||____|\\___/|_|\\_\\  \\_/\\_/   \\__|
  `));
  console.log(C.hex(secondary, "  Neo Read Write Create // v3.0.0\n"));
}

// ─── CLI command definition ──────────────────────────────────────────────────
const main = defineCommand({
  meta: {
    name: "neorwc",
    version: "3.3.0",
    description: "Neorwc: Documentation Suite",
  },
  args: {
    model:    { type: "string", alias: "m", description: "Ollama model", valueHint: "type" },
    ctx:      { type: "string", alias: "c", description: "Override Context Window (default: auto-detect)", valueHint: "number" },
    plan:     { type: "string", alias: "p", description: "Use a global plan (e.g., api-docs)", valueHint: "name" },
    skill:    { type: "string", alias: "s", description: "Use a specific persona skill (e.g., technical-writer)", valueHint: "name" },
    init:     { type: "boolean", alias: "n", description: "Initialize ~/.neorwc folder with default templates" },
    templates: { type: "boolean", alias: "t", description: "List available templates from GitHub" },
    install:  { type: "string", alias: "i", description: "Install a template (use \"all\" for everything)", valueHint: "name" },
    list:     { type: "boolean", alias: "l", description: "List installed local resources, List available Global Plans and Skills" },
    "dry-run": { type: "boolean", alias: "d", description: "Scan and plan without writing files" },
  },
  async run({ args }) {
    // citty stores kebab-case keys as-is, access via bracket notation
    const dryRun = (args as Record<string, unknown>)["dry-run"] as boolean | undefined;

    // --- STANDALONE FLAGS (match original ordering + process.exit behaviour) ---
    if (args.templates)  { await listRemoteTemplates(); return; }
    if (args.install)    { await installTemplate(args.install as string); return; }
    if (args.init)       { return await handleInit(); }
    if (args.list)       { return await handleList(); }

    // --- MAIN DOCUMENTATION FLOW ---

    // load persisted state, merge with CLI flags
    const savedState = await loadState();
    const selectedModel = (args.model as string) || savedState.model || config.DEFAULT_MODEL;

    printLogo();
    console.log(C.gray(`  Using Model: ${C.cyan(selectedModel)}`));

    // Phase 1 — connect to model + scan project
    // (original uses 2 separate ora spinners; we use listr2 for cleaner flow)
    const phase1 = new Listr<{
      modelCaps: { maxContext: number; exists: boolean };
      scanResult: ScanResult;
    }>([
      {
        title: "Connecting to model",
        task: async (ctx, task) => {
          task.output = `Connecting to ${selectedModel}...`;
          ctx.modelCaps = await getModelCapabilities(selectedModel);
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

    // resolve context: CLI flag > saved state > model auto-detect > hard default
    let contextLimit = 65536;
    if (args.ctx)            contextLimit = parseInt(args.ctx as string);
    else if (savedState.ctx) contextLimit = savedState.ctx;
    else                     contextLimit = modelCaps.maxContext;

    // match original: show "Model loaded. Max Context: ..." AFTER context is resolved
    console.log(`  ${C.green("\u2713")} Model loaded. Max Context: ${C.bold(String(contextLimit))} tokens.\n`);

    await saveState({ model: selectedModel, ctx: contextLimit, lastRun: new Date().toISOString() });
    console.log(C.gray(`  (Settings saved to docs/.neorwc)`));

    drawUsageBar(scanResult.tokenEstimate, contextLimit);

    if (scanResult.tokenEstimate > contextLimit) {
      console.log(C.red(`  \u26A0 Warning: Input exceeds model limit (${contextLimit}). Truncation will occur.`));
    }

    // --- LOAD INSTRUCTIONS: skill (persona), plan (strategy), local context ---
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

    if (args.plan) {
      const plansDir = join(config.GLOBAL_PATHS.ROOT, "plans");
      const planPath = join(plansDir, `${args.plan}.md`);
      if (existsSync(planPath)) {
        combinedInstructions += `\n\n--- EXECUTE THIS PLAN ---\n${await readFile(planPath, "utf-8")}`;
        console.log(C.hex(config.COLORS.info, `  + Loaded Plan: ${args.plan}`));
      } else {
        console.log(C.red(`  x Plan '${args.plan}' not found in ~/.neorwc/plans`));
      }
    }

    // project-specific instructions from neorwc.md in cwd
    if (existsSync(config.CONTEXT_FILE)) {
      combinedInstructions += `\n\n--- PROJECT SPECIFIC INSTRUCTIONS ---\n${await readFile(config.CONTEXT_FILE, "utf-8")}`;
      console.log(C.green(`  + Loaded Local: ${config.CONTEXT_FILE}`));
    }

    // fallback: prompt for name + description when no plan/skill given
    let projectName = process.cwd().split(/[\\/]/).pop() || "project";
    if (!combinedInstructions) {
      const rl = readline.createInterface({ input, output });
      projectName = (await rl.question(`Project Name [${projectName}]: `)) || projectName;
      const desc = await rl.question("Brief Description / Instructions: ");
      rl.close();
      combinedInstructions = desc || "Generate standard documentation.";
    }

    // confirm before hitting the AI
    const proceed = await promptConfirm(
      dryRun ? "Run dry-run analysis?" : "Generate documentation now?",
      true,
    );
    if (!proceed) return;

    // Phase 2 — AI generation + file writing
    const phase2 = new Listr<{ aiResponse: string }>([
      {
        title: "Thinking",
        task: async (ctx, task) => {
          task.output = `Thinking (${selectedModel})...`;
          ctx.aiResponse = await generateDocumentation({
            model: selectedModel,
            context: scanResult.context,
            instructions: combinedInstructions,
            projectName,
            ctxSize: contextLimit,
          });
        },
      },
      {
        title: "Writing files",
        task: async (ctx, task) => {
          if (dryRun) {
            task.output = "Dry-run mode — no files written";
            console.log(C.yellow("\n-- DRY RUN OUTPUT --"));
            console.log(ctx.aiResponse.substring(0, 500));
            return;
          }
          const files = await parseAndWrite(ctx.aiResponse, process.cwd());
          if (files.length > 0) {
            task.output = `Created ${files.length} files`;
            console.log(C.green(`\n\u2714 Created ${files.length} files.`));
            for (const f of files) console.log(C.gray(` - ${f}`));
            console.log(C.gray(`  (Settings saved to docs/.neorwc)`));
            console.log(C.green(`\n\u2714 Documentation updated.`));
          } else {
            console.log(C.red("\u26A0 No files parsed."));
          }
        },
      },
    ], { rendererOptions: { showTimer: true } });

    try {
      await phase2.run();
    } catch (error) {
      console.log(C.red(`\u2717 Error`));
      console.error(C.red((error as Error).message));
    }
  },
});

// ─── STANDALONE HANDLERS ─────────────────────────────────────────────────────

async function handleInit(): Promise<void> {
  const { ROOT, SKILLS } = config.GLOBAL_PATHS;
  // original uses "PLANS" from GLOBAL_PATHS, but GLOBAL_PATHS doesn't define PLANS → bug
  // we define plans under ROOT/plans
  if (existsSync(ROOT)) {
    console.log(C.yellow(`\u26A0  Configuration folder already exists at ${ROOT}`));
    return;
  }

  const spin = createSpinner("Initializing Neorwc with Neorwc-Style Profiles...").start();

  await mkdir(SKILLS, { recursive: true });
  await mkdir(join(ROOT, "plans"), { recursive: true });

  // write default skill (persona) — same content as original
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
- Use clear headings (e.g. H1, H2, H3, H4 more).
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

  // write default plan (comprehensive suite)
  await writeFile(
    join(ROOT, "plans", "full-suite.md"),
    `# Plan: Comprehensive Architecture Breakdown
**Goal:** Create a full documentation suite suitable for enterprise handover.

**Required Files:**
1. \`docs/README.md\`: High-level overview, badges, quick start.
2. \`docs/architecture/system-design.md\`: 
   - Explain the folder structure.
   - Diagram the data flow.
3. \`docs/api/reference.md\` (if API exists): 
   - Endpoints, Methods, Payloads.
4. \`docs/guides/contribution.md\`:
   - Setup instructions.
   - Linting/Testing rules.
5. e.g. mores (if need).

**Style:** Markdown with rigorous detail.`,
    "utf-8",
  );

  spin.succeed(`Initialized at ${C.bold(ROOT)}`);
  console.log(C.green(`  \u2714 Created Skill: neorwc-architect`));
  console.log(C.green(`  \u2714 Created Plan: full-suite`));
}

async function handleList(): Promise<void> {
  const { ROOT, SKILLS } = config.GLOBAL_PATHS;
  console.log(C.cyan("\n\uD83D\uDCC2 Available Global Resources:\n"));

  // list installed skills
  if (existsSync(SKILLS)) {
    const files = await readdir(SKILLS);
    console.log(C.bold("  Skills:"));
    for (const f of files.filter((f) => f.endsWith(".md"))) {
      console.log(`    - ${f.replace(".md", "")}`);
    }
  } else {
    console.log(C.gray("  No skills folder found. Run --init"));
  }

  // list installed plans
  const plansDir = join(ROOT, "plans");
  if (existsSync(plansDir)) {
    const files = await readdir(plansDir);
    console.log(C.bold("\n  Plans:"));
    for (const f of files.filter((f) => f.endsWith(".md"))) {
      console.log(`    - ${f.replace(".md", "")}`);
    }
  } else {
    console.log(C.gray("\n  No plans folder found. Run --init"));
  }

  // show modelpedia provider info
  const { getModelsByProvider } = await import("modelpedia");
  console.log(C.bold("\n  Model Providers (via modelpedia):"));
  for (const provider of ["openai", "anthropic", "google"]) {
    const models = getModelsByProvider(provider);
    if (models.length > 0) {
      console.log(`    ${provider}: ${models.length} models available`);
    }
  }
  console.log("");
}

runMain(main);
