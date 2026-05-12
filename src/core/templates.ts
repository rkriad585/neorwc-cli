import { join } from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { config } from "./config.ts";

// modelpedia import for enriching templates with model data
import { getModelsByProvider } from "modelpedia";

interface GitHubItem {
  name: string;
  type: string;
}

// fetch directory listing from GitHub API
async function fetchList(type: string): Promise<string[]> {
  try {
    const url = `${config.GITHUB_API_BASE}/${type}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = (await response.json()) as GitHubItem[];
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item.name.endsWith(".md"))
      .map((item) => item.name.replace(".md", ""));
  } catch {
    return [];
  }
}

// download raw content from GitHub
async function downloadFile(
  type: string,
  name: string,
  destDir: string
): Promise<boolean> {
  try {
    const url = `${config.GITHUB_RAW_BASE}/${type}/${name}.md`;
    const response = await fetch(url);
    if (!response.ok) return false;
    const content = await response.text();
    await mkdir(destDir, { recursive: true });
    await writeFile(join(destDir, `${name}.md`), content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function listRemoteTemplates(): Promise<void> {
  console.log(`Connecting to github.com/${config.REPO_OWNER}/${config.REPO_NAME}...\n`);

  const skills = await fetchList("skills");

  console.log("Remote Templates Available:\n");

  console.log("  Skills:");
  if (skills.length === 0) console.log("    (No skills found)");
  for (const s of skills) console.log(`    - ${s}`);

  // also show modelpedia provider info
  console.log("\n  Model Providers (via modelpedia):");
  for (const provider of ["openai", "anthropic", "google"]) {
    const models = getModelsByProvider(provider);
    if (models.length > 0) {
      console.log(`    ${provider}: ${models.length} models available`);
    }
  }
  console.log("");
}

export async function installTemplate(name: string): Promise<void> {
  const { SKILLS } = config.GLOBAL_PATHS;

  if (name === "all") {
    const skills = await fetchList("skills");
    console.log(`Downloading ${skills.length} templates...`);
    for (const s of skills) {
      if (await downloadFile("skills", s, SKILLS)) {
        console.log(`  Installed Skill: ${s}`);
      }
    }
    return;
  }

  const isSkill = (await fetchList("skills")).includes(name);
  if (isSkill) {
    if (await downloadFile("skills", name, SKILLS)) {
      console.log(`  Installed Skill: ${name}`);
    } else {
      console.log(`  Failed to install: ${name}`);
    }
  } else {
    console.log(`  Template '${name}' not found in remote repo.`);
    console.log(`    Run --templates to see available options.`);
  }
}
