import { join, basename } from "node:path";
import { readdir } from "node:fs/promises";
import type { Tool } from "./types.ts";

// build an indented directory tree of the project
async function buildTree(
  dir: string,
  prefix: string,
  root: string,
  depth: number,
  maxDepth: number
): Promise<string> {
  if (depth > maxDepth) return `${prefix}  ...\n`;

  let entries: string[] = [];

  try {
    entries = await readdir(dir, { withFileTypes: false });
  } catch {
    return `${prefix}[permission denied]\n`;
  }

  entries.sort();

  // filter out ignored dirs at top level
  const filtered: string[] = [];
  for (const name of entries) {
    const abs = join(dir, name);
    const stat = await Bun.file(abs).stat().catch(() => null);
    if (!stat) continue;
    if (depth === 0 && (name.startsWith(".") || name === "node_modules")) continue;
    filtered.push(name);
  }

  let result = "";

  for (let i = 0; i < filtered.length; i++) {
    const name = filtered[i];
    const isLast = i === filtered.length - 1;
    const marker = isLast ? "└── " : "├── ";
    const abs = join(dir, name);
    const stat = await Bun.file(abs).stat().catch(() => null);
    if (!stat) continue;

    result += `${prefix}${marker}${name}\n`;

    if (stat.isDirectory()) {
      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      result += await buildTree(abs, nextPrefix, root, depth + 1, maxDepth);
    }
  }

  return result;
}

// show the project directory structure
const tool: Tool = {
  name: "project_tree",
  description: "Show the project directory tree structure",
  parameters: {
    path: { type: "string", description: "Subdirectory to show (default: project root)" },
    depth: { type: "number", description: "Max depth (default: 3)" },
  },
  async execute(args, _dryRun) {
    const root = process.cwd();
    const subPath = args.path ? join(root, args.path as string) : root;
    const maxDepth = (args.depth as number) ?? 3;

    const tree = await buildTree(subPath, "", root, 1, maxDepth);
    return `Project tree (max depth: ${maxDepth}):\n${basename(root)}/\n${tree || "(empty)"}`;
  },
};

export default tool;
