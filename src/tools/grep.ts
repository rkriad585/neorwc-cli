import { join } from "node:path";
import type { Tool } from "./types.ts";

// search file contents for a regex pattern
const tool: Tool = {
  name: "grep",
  description: "Search file contents for a regex pattern",
  parameters: {
    pattern: { type: "string", description: "Regex pattern to search for", required: true },
    include: { type: "string", description: "Glob pattern to filter files (e.g. *.ts)" },
  },
  async execute(args, _dryRun) {
    const pattern = args.pattern as string;
    const include = args.include as string | undefined;
    const root = process.cwd();
    const results: string[] = [];

    // use Bun's Glob to find files
    const glob = new Bun.Glob(include || "**/*");
    let count = 0;

    try {
      for await (const file of glob.scan({ cwd: root })) {
        // skip binary and ignored dirs
        if (file.includes("node_modules") || file.includes(".git")) continue;

        try {
          const content = await Bun.file(join(root, file)).text();
          if (content.includes("\0")) continue; // skip binary

          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(new RegExp(pattern, "i"))) {
              results.push(`${file}:${i + 1}: ${lines[i].trim().substring(0, 120)}`);
              count++;
            }
          }
        } catch {
          // skip unreadable files
        }
      }
    } catch {
      return `ERROR: Invalid pattern "${pattern}"`;
    }

    if (count === 0) return `No matches found for "${pattern}"`;
    return results.slice(0, 200).join("\n") + (count > 200 ? `\n... and ${count - 200} more matches` : "");
  },
};

export default tool;
