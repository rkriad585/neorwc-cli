import type { Tool } from "./types.ts";

// find files by glob pattern
const tool: Tool = {
  name: "search",
  description: "Find files by glob pattern (e.g. **/*.ts, src/**/*)",
  parameters: {
    pattern: { type: "string", description: "Glob pattern to match file names", required: true },
  },
  async execute(args, _dryRun) {
    const pattern = args.pattern as string;
    const root = process.cwd();
    const glob = new Bun.Glob(pattern);
    const files: string[] = [];

    try {
      for await (const file of glob.scan({ cwd: root, dot: true })) {
        if (files.length >= 500) {
          files.push(`... and more (truncated at 500)`);
          break;
        }
        files.push(file);
      }
    } catch {
      return `ERROR: Invalid glob pattern "${pattern}"`;
    }

    if (files.length === 0) return `No files matching "${pattern}"`;
    return files.join("\n");
  },
};

export default tool;
