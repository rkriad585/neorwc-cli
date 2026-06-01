import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import boxen from "boxen";
import chalk from "chalk";
import ora from "ora";

// version injected at build time (compiled binary) or placeholder (source mode)
import { VERSION_TAG } from "../core/__version.ts";

// static JSON imports — Bun bundles these into the compiled binary
import neorwcTips from "./tips_template/neorwc_tips.json" with { type: "json" };
import bunTips from "./tips_template/bun.json" with { type: "json" };
import gitTips from "./tips_template/git.json" with { type: "json" };
import tsTips from "./tips_template/typescript.json" with { type: "json" };
import jsonTips from "./tips_template/json.json" with { type: "json" };
import nodejsTips from "./tips_template/nodejs.json" with { type: "json" };
import cliTips from "./tips_template/cli.json" with { type: "json" };
import securityTips from "./tips_template/security.json" with { type: "json" };
import performanceTips from "./tips_template/performance.json" with { type: "json" };
import markdownTips from "./tips_template/markdown.json" with { type: "json" };
import designTips from "./tips_template/design.json" with { type: "json" };
import debuggingTips from "./tips_template/debugging.json" with { type: "json" };
import testingTips from "./tips_template/testing.json" with { type: "json" };
import cssTips from "./tips_template/css.json" with { type: "json" };
import pythonTips from "./tips_template/python.json" with { type: "json" };
import dockerTips from "./tips_template/docker.json" with { type: "json" };
import linuxTips from "./tips_template/linux.json" with { type: "json" };
import npmTips from "./tips_template/npm.json" with { type: "json" };
import apiTips from "./tips_template/api.json" with { type: "json" };
import databaseTips from "./tips_template/database.json" with { type: "json" };

const __dir = dirname(fileURLToPath(import.meta.url));

// shape of a tip JSON file
interface TipFile {
  category: string;
  tips: string[];
}

// shape of a single resolved tip
interface ResolvedTip {
  category: string;
  message: string;
  hint: string;
}

// registry of all tip categories — statically imported for compiled binary support
const TIP_REGISTRY: Record<string, TipFile> = {
  neorwc_tips: neorwcTips as TipFile,
  bun: bunTips as TipFile,
  git: gitTips as TipFile,
  typescript: tsTips as TipFile,
  json: jsonTips as TipFile,
  nodejs: nodejsTips as TipFile,
  cli: cliTips as TipFile,
  security: securityTips as TipFile,
  performance: performanceTips as TipFile,
  markdown: markdownTips as TipFile,
  design: designTips as TipFile,
  debugging: debuggingTips as TipFile,
  testing: testingTips as TipFile,
  css: cssTips as TipFile,
  python: pythonTips as TipFile,
  docker: dockerTips as TipFile,
  linux: linuxTips as TipFile,
  npm: npmTips as TipFile,
  api: apiTips as TipFile,
  database: databaseTips as TipFile,
};

// command hints per category
const HINTS: Record<string, string> = {
  neorwc_tips: "Try: neorwc --list to see all skills",
  bun: "Try: bun run neorwc.ts --help",
  git: "Try: git status && git log --oneline -3",
  typescript: "Try: bunx tsc --noEmit to typecheck",
  json: "Try: neorwc --config to edit config.json",
  nodejs: "Try: bun run neorwc.ts --help",
  cli: "Try: neorwc --help for all commands",
  security: "Try: never commit secrets to version control",
  performance: "Try: bun run neorwc.ts --help",
  markdown: "Try: neorwc --list to see doc skills",
  design: "Try: keep functions pure and modules focused",
  debugging: "Try: use console.table() for structured data",
  testing: "Try: bun test for fast TypeScript tests",
  css: "Try: learn CSS Grid — it changes layout forever",
  python: "Try: python -m venv .venv to create a virtual env",
  docker: "Try: docker compose up for multi-service dev",
  linux: "Try: man <command> for the built-in manual",
  npm: "Try: npm outdated to find stale dependencies",
  api: "Try: curl -v to see full HTTP request/response",
  database: "Try: EXPLAIN ANALYZE to debug slow queries",
};

// get git commit hash (short) — falls back if unavailable
function getGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

// get project version — use injected __version.ts first, fallback to .version file
function getVersion(): string {
  if ((VERSION_TAG as string) !== "v0.0.0") return VERSION_TAG;
  try {
    return readFileSync(join(__dir, "..", "..", ".version"), "utf-8").trim();
  } catch {
    return "v0.0.0";
  }
}

// list all registered tip categories
function getCategories(): string[] {
  return Object.keys(TIP_REGISTRY);
}

// load tips for a given category from the static registry
function loadTips(category: string): TipFile {
  return TIP_REGISTRY[category] || { category, tips: [] };
}

// pick a random item from an array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// resolve a tip: pick random category + random tip + matching hint
function resolveTip(category?: string): ResolvedTip {
  const cats = getCategories();
  const cat = category || randomPick(cats);
  const file = loadTips(cat);
  const tip = file.tips.length > 0
    ? randomPick(file.tips)
    : "No tips available for this category";
  const hint = HINTS[cat] || "Run neorwc --help for all commands";
  return { category: cat, message: tip, hint };
}

// show a styled tip banner using boxen + ora
export function showTip(category?: string): void {
  const spin = ora({ text: "Loading tips...", color: "cyan" }).start();

  const { message, hint } = resolveTip(category);
  const version = getVersion();
  const commit = getGitCommit();

  const content = [
    "",
    `  ${chalk.bold("Author")} : ${chalk.cyan("RK Riad Khan")}`,
    `  ${chalk.bold("Version")}: ${chalk.green(version)}`,
    `  ${chalk.bold("Commit")} : ${chalk.yellow(commit)}`,
    `  ${chalk.bold("GitHub")} : ${chalk.blue("rkriad585/neorwc-cli")}`,
    "",
    `  ${chalk.magenta.bold("TIP")}  ${chalk.italic(message)}`,
    `  ${chalk.dim(hint)}`,
    "",
  ].join("\n");

  spin.stop();

  console.log(
    boxen(content, {
      title: chalk.hex("#00D8FF").bold("neorwc"),
      titleAlignment: "center",
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "#00D8FF",
    })
  );
}

// re-export for external use
export { getCategories, loadTips, resolveTip };
