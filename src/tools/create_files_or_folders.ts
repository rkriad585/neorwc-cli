import { join, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { Tool } from "./types.ts";

// create directories or empty files in the project
const tool: Tool = {
  name: "create_files_or_folders",
  description: "Create one or more directories or empty files",
  parameters: {
    paths: { type: "array", description: "Paths to create", required: true },
    type: { type: "string", description: "\"file\" or \"folder\"", required: true },
  },
  async execute(args, dryRun) {
    const paths = args.paths as string[];
    const type = args.type as string;
    const root = process.cwd();
    const results: string[] = [];

    for (const p of paths) {
      const fullPath = join(root, p);

      if (dryRun) {
        results.push(`[DRY-RUN] Would create ${type}: ${p}`);
        continue;
      }

      if (type === "folder") {
        await mkdir(fullPath, { recursive: true });
      } else {
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, "", "utf-8");
      }
      results.push(`Created ${type}: ${p}`);
    }

    return results.join("\n");
  },
};

export default tool;
