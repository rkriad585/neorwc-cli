import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { config } from "./config.ts";

export interface AppState {
  model?: string;
  ctx?: number;
  lastRun?: string;
  lastUpdated?: string;
}

const STATE_DIR = join(process.cwd(), config.DOCS_DIR_ROOT);
const STATE_FILE = join(STATE_DIR, ".neorwc");

export async function loadState(): Promise<AppState> {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(await readFile(STATE_FILE, "utf-8")) as AppState;
    }
  } catch {
    // ignore read errors
  }
  return {};
}

export async function saveState(data: Partial<AppState>): Promise<void> {
  try {
    await mkdir(STATE_DIR, { recursive: true });
    const current = await loadState();
    const newState: AppState = {
      ...current,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    await writeFile(STATE_FILE, JSON.stringify(newState, null, 2), "utf-8");
  } catch {
    console.error("Warning: Could not save project state.");
  }
}
