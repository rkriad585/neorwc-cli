#!/usr/bin/env bun

// tip banner — side-effect on import (shows before any CLI output)
import "./src/tips/index.ts";

import { defineCommand, runMain } from "citty";
import { Listr } from "listr2";
import cliSpinners, { randomSpinner } from "cli-spinners";
import { basename, join, resolve } from "node:path";
import { existsSync, readFileSync, unlinkSync, rmSync, readdirSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output, execPath, argv } from "node:process";
import { platform, tmpdir } from "node:os";
import { execSync, spawn } from "node:child_process";
import { config } from "./src/core/config.ts";
import { scanProject } from "./src/core/scanner.ts";
import { generateDocumentation, getModelCapabilities } from "./src/core/ai.ts";
import { loadMergedConfig, saveGlobalConfig } from "./src/core/config-manager.ts";
import { saveState } from "./src/core/state.ts";
import { listRemoteTemplates, installTemplate } from "./src/core/templates.ts";
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
    provider: { type: "string", alias: "p", description: "Provider (google, openai, anthropic, deepseek, mistral, cohere, ollama)", valueHint: "name" },
     config:   { type: "boolean", alias: "g", description: "Open interactive TUI for editing configuration" },
    selfuninstall: { type: "boolean", description: "Uninstall neorwc and remove all config files" },
    update: { type: "boolean", alias: "u", description: "Self-update neorwc to the latest version" },
  },
  async run({ args }) {
    const dryRun = (args as Record<string, unknown>)["dry-run"] as boolean | undefined;

    // --- Standalone flags ---
    if (args.selfuninstall) { handleSelfUninstall(); return; }
    if (args.update)     { await handleUpdate(); return; }
    if (args.config)     { const { openConfigTUI } = await import("./src/core/config-tui.ts"); await openConfigTUI(); return; }
    if (args.templates)  { await listRemoteTemplates(); return; }
    if (args.install)    { await installTemplate(args.install as string); return; }
    if (args.init)       { return await handleInit(); }
    if (args.list)       { return await handleList(); }

    // --- Main flow ---
    const mergedConfig = await loadMergedConfig();
    const selectedModel = (args.model as string) || mergedConfig.model || config.DEFAULT_MODEL;
    const selectedProvider = (args.provider as string) || mergedConfig.provider;

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
    ], { rendererOptions: { showTimer: true } as any });

    const { modelCaps, scanResult } = await phase1.run();

    // Resolve context: flag > merged config > model auto-detect > hard default
    let contextLimit = 65536;
    if (args.ctx) {
      const parsed = parseInt(args.ctx as string);
      if (!isNaN(parsed)) contextLimit = parsed;
    } else if (mergedConfig.ctx) contextLimit = mergedConfig.ctx;
    else                     contextLimit = modelCaps.maxContext;

    console.log(`  ${C.green("\u2713")} Model loaded. Max Context: ${C.bold(String(contextLimit))} tokens.\n`);

    // Persist settings globally AND locally so future runs pick them up
    await Promise.all([
      saveGlobalConfig({ provider: selectedProvider, model: selectedModel, ctx: contextLimit }),
      saveState({ provider: selectedProvider, model: selectedModel, ctx: contextLimit, lastRun: new Date().toISOString() }),
    ]);

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
        console.log(C.red(`  x Skill '${args.skill}' not found in ${config.GLOBAL_PATHS.SKILLS}`));
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
    const STATUSES = ["Thinking", "Cooking", "Besting", "Bubbling", "Working", "Creating"];
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
    ], { rendererOptions: { showTimer: true } as any });

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

  const { getProvider, getModelsByProvider } = await import("modelpedia");
  console.log(C.bold("  Model Providers (via modelpedia):\n"));

  for (const name of ["openai", "anthropic", "google", "deepseek", "mistral", "cohere"]) {
    const provider = getProvider(name);
    const models = getModelsByProvider(name);
    if (!provider || models.length === 0) continue;

     console.log(`    ${C.bold(provider.name)}`);
     console.log(`      API: ${C.cyan(provider.api_url)}`);
     console.log(`      Models (${models.length} total):`);

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

function handleSelfUninstall(): void {
   const { ROOT: configDir } = config.GLOBAL_PATHS;
   const isWindows = platform() === "win32";

   let binaryPath: string;
   try {
     if (typeof Bun !== "undefined") {
       binaryPath = realpathSync(argv[1] || execPath);
     } else {
       binaryPath = realpathSync(execPath);
     }
   } catch {
     binaryPath = realpathSync(execPath);
   }
   binaryPath = resolve(binaryPath);
   const configDirResolved = resolve(configDir);
   const normalizedConfigDir = configDirResolved.endsWith("\\") || configDirResolved.endsWith("/")
     ? configDirResolved
     : configDirResolved + (isWindows ? "\\" : "/");
   const isBinaryInsideConfig = isWindows
     ? binaryPath.toLowerCase().startsWith(normalizedConfigDir.toLowerCase())
     : binaryPath.startsWith(normalizedConfigDir);

  console.log(C.yellow("\nUninstalling neorwc...\n"));

  function deleteDirContentsExcept(dir: string, exceptPath: string): void {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = resolve(join(dir, entry));
      const resolvedExcept = resolve(exceptPath);
      if (fullPath === resolvedExcept || (isWindows && fullPath.toLowerCase() === resolvedExcept.toLowerCase())) {
        continue;
      }
      try {
        const stat = lstatSync(fullPath);
        if (stat.isDirectory()) {
          rmSync(fullPath, { recursive: true, force: true });
        } else {
          unlinkSync(fullPath);
        }
      } catch {
        // ignore
      }
    }
  }

  if (isWindows) {
    if (isBinaryInsideConfig) {
      deleteDirContentsExcept(configDirResolved, binaryPath);

      const batContent = `@echo off
timeout /t 1 /nobreak >nul
rmdir /s /q "${configDirResolved}"
echo neorwc has been uninstalled.
(goto) 2>nul & del "%~f0"`;

      const batPath = join(tmpdir(), `neorwc-uninstall-${Date.now()}.bat`);
      writeFileSync(batPath, batContent);

      console.log(C.gray("  Launching cleanup..."));

      spawn("cmd", ["/C", "start", "/B", batPath], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }).unref();
    } else {
      if (existsSync(configDirResolved)) {
        try {
          rmSync(configDirResolved, { recursive: true, force: true });
        } catch {
          try {
            execSync(`rmdir /s /q "${configDirResolved}"`, { stdio: "ignore" });
          } catch {
            // ignore
          }
        }
      }

      const batContent = `@echo off
timeout /t 1 /nobreak >nul
del /f /q "${binaryPath}"
echo neorwc has been uninstalled.
(goto) 2>nul & del "%~f0"`;

      const batPath = join(tmpdir(), `neorwc-uninstall-${Date.now()}.bat`);
      writeFileSync(batPath, batContent);

      console.log(C.gray("  Launching cleanup..."));

       spawn("cmd", ["/C", "start", "/B", batPath], {
         detached: true,
         stdio: "ignore",
         windowsHide: true,
       }).unref();
     }
   } else {
     // Unix: can delete running binary
     if (existsSync(configDirResolved)) {
       rmSync(configDirResolved, { recursive: true, force: true });
     }
     try {
       unlinkSync(binaryPath);
     } catch (e) {
       console.log(C.yellow(`  Note: Could not remove binary at ${binaryPath}`));
       console.log(C.gray(`  ${(e as Error).message}`));
     }
   }

  console.log(C.green("\u2714 Uninstall completed."));
  console.log(C.gray(`\n  Please remove the neorwc PATH entry from your shell rc file`));
  console.log(C.gray(`  (e.g., ~/.bashrc, ~/.zshrc, ~/.bash_profile, or Windows PATH)`));
  console.log(C.gray(`  The path was: ~/.config/neostore/neorwc/bin/\n`));
}

async function handleUpdate(): Promise<void> {
  const repoOwner = "rkriad585";
  const repoName = "neorwc-cli";
  const binaryName = "neorwc";
  const isWindows = platform() === "win32";

  // Detect current platform and arch for download
  const osName = isWindows ? "windows" : platform() === "darwin" ? "darwin" : "linux";
  const archRaw = process.arch;
  const archName = archRaw === "x64" ? "amd64" : archRaw === "arm64" ? "arm64" : "amd64";
  const downloadBinary = `${binaryName}-${osName}-${archName}${isWindows ? ".exe" : ""}`;

  // Get current binary path
  let currentPath: string;
  try {
    if (typeof Bun !== "undefined") {
      currentPath = realpathSync(argv[1] || execPath);
    } else {
      currentPath = realpathSync(execPath);
    }
  } catch {
    currentPath = realpathSync(execPath);
  }
  currentPath = resolve(currentPath);

  console.log(C.cyan(`\n  Checking for updates...\n`));

  // Fetch latest version
  let latestVersion: string;
  try {
    const resp = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/.version`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    latestVersion = (await resp.text()).trim().replace(/^v/, "");
  } catch {
    console.log(C.red(`  Failed to fetch latest version from GitHub.`));
    console.log(C.gray(`  Check your internet connection.`));
    return;
  }

  const currentVersion = VERSION;

  console.log(`  Current: v${currentVersion}`);
  console.log(`  Latest:  v${latestVersion}`);

  if (currentVersion === latestVersion) {
    console.log(C.green(`\n  \u2714 neorwc is already up to date.`));
    return;
  }

  // Compare versions (simple string compare works for semver)
  if (currentVersion.localeCompare(latestVersion, undefined, { numeric: true }) >= 0) {
    console.log(C.green(`\n  \u2714 neorwc is already up to date.`));
    return;
  }

  console.log(C.yellow(`\n  New version available: v${latestVersion}`));

  const proceed = await promptConfirm("  Download and install update?", true);
  if (!proceed) return;

  // Download new binary to temp
  const downloadUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/v${latestVersion}/${downloadBinary}`;
  const tmpPath = join(tmpdir(), `${binaryName}-update-${Date.now()}${isWindows ? ".exe" : ""}`);

  const spin = createSpinner("Downloading update...").start();
  try {
    const resp = await fetch(downloadUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buffer = await resp.arrayBuffer();
    writeFileSync(tmpPath, new Uint8Array(buffer));
    if (!isWindows) {
      execSync(`chmod +x "${tmpPath}"`);
    }
  } catch (e) {
    spin.fail(`Download failed: ${(e as Error).message}`);
    try { unlinkSync(tmpPath); } catch {}
    return;
  }
  spin.succeed("Downloaded update.");

  // Replace current binary
  const spin2 = createSpinner("Installing update...").start();
  try {
    if (isWindows) {
      // Windows: can't replace running exe, use rename trick
      const batContent = `@echo off
timeout /t 1 /nobreak >nul
move /y "${tmpPath}" "${currentPath}" >nul 2>&1
echo neorwc updated to v${latestVersion}.
(goto) 2>nul & del "%~f0"`;
      const batPath = join(tmpdir(), `neorwc-update-${Date.now()}.bat`);
      writeFileSync(batPath, batContent);
      spawn("cmd", ["/C", "start", "/B", batPath], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }).unref();
      spin2.succeed(`Installed v${latestVersion}. Restart your terminal.`);
    } else {
      // Unix: overwrite running binary (inode-based, works fine)
      writeFileSync(currentPath, readFileSync(tmpPath));
      execSync(`chmod +x "${currentPath}"`);
      try { unlinkSync(tmpPath); } catch {}
      spin2.succeed(`Updated to v${latestVersion}!`);
    }
  } catch (e) {
    spin2.fail(`Install failed: ${(e as Error).message}`);
    console.log(C.gray(`  Binary saved at: ${tmpPath}`));
    console.log(C.gray(`  Manually copy it to: ${currentPath}`));
  }
}

runMain(main);
