import { join, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { config } from "../core/config.ts";
import type { Tool } from "./types.ts";

// write documentation files (always placed under docs/)
const tool: Tool = {
  name: "write_files",
  description: "Write content to files. Files are automatically placed under the docs/ directory.",
  parameters: {
    files: {
      type: "array",
      description: "Array of {path: relative path, content: file content} objects",
      required: true,
    },
  },
  async execute(args, dryRun) {
    const files = args.files as Array<{ path: string; content: string }>;
    const root = process.cwd();
    const created: string[] = [];

    for (const f of files) {
      // enforce docs/ prefix
      let relativePath = f.path.trim();
      if (!relativePath.startsWith(config.DOCS_DIR_ROOT)) {
        relativePath = join(config.DOCS_DIR_ROOT, relativePath);
      }

      const fullPath = join(root, relativePath);

      if (dryRun) {
        created.push(`[DRY-RUN] Would write: ${relativePath} (${f.content.length} chars)`);
        continue;
      }

      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, f.content, "utf-8");
      created.push(relativePath);
    }

    return created.join("\n");
  },
};

export default tool;
