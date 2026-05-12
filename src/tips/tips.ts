import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import boxen from "boxen";
import chalk from "chalk";
import ora from "ora";

// static JSON imports — Bun bundles these into the compiled binary
import neorwcTips from "./tips_template/neorwc_tips.json" with { type: "json" };
import bunTips from "./tips_template/bun.json" with { type: "json" };
import gitTips from "./tips_template/git.json" with { type: "json" };
import tsTips from "./tips_template/typescript.json" with { type: "json" };

// version injected at build time (compiled binary) or placeholder (source mode)
import { VERSION_TAG } from "../core/__version.ts";

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
};

// command hints per category
const HINTS: Record<string, string> = {
  neorwc_tips: "Try: neorwc --list to see all skills",
  bun: "Try: bun run neorwc.ts --help",
  git: "Try: git status && git log --oneline -3",
  typescript: "Try: bunx tsc --noEmit to typecheck",
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
  if (VERSION_TAG !== "v0.0.0") return VERSION_TAG;
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

  const { category: cat, message, hint } = resolveTip(category);
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
