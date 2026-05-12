import { join } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import type { Tool } from "./types.ts";

// edit an existing file by replacing old_string with new_string
const tool: Tool = {
  name: "edit_files",
  description: "Edit a file by replacing old_string with new_string (first occurrence only)",
  parameters: {
    path: { type: "string", description: "File path relative to project root", required: true },
    old_string: { type: "string", description: "Text to find (exact match)", required: true },
    new_string: { type: "string", description: "Replacement text", required: true },
  },
  async execute(args, dryRun) {
    const filePath = args.path as string;
    const oldStr = args.old_string as string;
    const newStr = args.new_string as string;
    const fullPath = join(process.cwd(), filePath);

    if (dryRun) {
      return `[DRY-RUN] Would edit: ${filePath}`;
    }

    const content = await readFile(fullPath, "utf-8");

    if (!content.includes(oldStr)) {
      return `ERROR: old_string not found in ${filePath}`;
    }

    const updated = content.replace(oldStr, newStr);
    await writeFile(fullPath, updated, "utf-8");

    return `Edited: ${filePath}`;
  },
};

export default tool;
