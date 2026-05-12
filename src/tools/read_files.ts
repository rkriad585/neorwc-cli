import { join } from "node:path";
import type { Tool } from "./types.ts";

// read the full content of one or more project files
const tool: Tool = {
  name: "read_files",
  description: "Read the full content of one or more files (bypasses truncation)",
  parameters: {
    paths: { type: "array", description: "File paths relative to project root", required: true },
  },
  async execute(args, _dryRun) {
    const paths = args.paths as string[];
    const root = process.cwd();
    const results: string[] = [];

    for (const p of paths) {
      try {
        const fullPath = join(root, p);
        const content = await Bun.file(fullPath).text();
        results.push(`--- ${p} ---\n${content}\n--- END ${p} ---`);
      } catch (err) {
        results.push(`--- ${p} ---\nERROR: ${(err as Error).message}`);
      }
    }

    return results.join("\n\n");
  },
};

export default tool;
