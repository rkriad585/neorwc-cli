import { join } from "node:path";
import { config } from "./config.ts";

export interface ScanResult {
  context: string;
  fileCount: number;
  tokenEstimate: number;
}

const estimateTokens = (text: string): number => Math.ceil(text.length / 3.5);

const MAX_FILE_CHARS = 50_000;
const MAX_TOTAL_CHARS = 2_000_000;

function formatFile(filePath: string, content: string): string {
  if (content.length > MAX_FILE_CHARS) {
    const lines = content.split("\n");
    const head = lines.slice(0, 100).join("\n");
    const tail = lines.slice(-40).join("\n");
    return `\n\n=== FILE: ${filePath} (Partial) ===\n${head}\n...[${lines.length - 140} lines truncated]...\n${tail}\n=== END FILE ===\n`;
  }
  return `\n\n=== FILE: ${filePath} ===\n${content}\n=== END FILE ===\n`;
}

export async function scanProject(rootDir: string, ignorePatterns?: string[]): Promise<ScanResult> {
  if (typeof Bun === "undefined") {
    throw new Error("neorwc requires Bun runtime to scan files.");
  }
  const glob = new Bun.Glob("**/*");
  const allFiles = await Array.fromAsync(glob.scan({ cwd: rootDir, dot: true }));

  const patterns = ignorePatterns ?? config.IGNORE_PATTERNS;
  const files = allFiles.filter((file) => {
    if (file.startsWith(".git")) return false;
    for (const pattern of patterns) {
      if (new Bun.Glob(pattern).match(file)) return false;
    }
    return true;
  });

  let fullContext = `PROJECT FILES LIST:\n${files.join("\n")}\n`;
  let fileCount = 0;

  for (const file of files) {
    try {
      const content = await Bun.file(join(rootDir, file)).text();
      if (!content.includes("\0")) {
        const formatted = formatFile(file, content);
        if (fullContext.length + formatted.length > MAX_TOTAL_CHARS) {
          fullContext += `\n\n...[remaining ${files.length - fileCount} files omitted due to total context limit]...\n`;
          break;
        }
        fullContext += formatted;
        fileCount++;
      }
    } catch {
    }
  }

  return { context: fullContext, fileCount, tokenEstimate: estimateTokens(fullContext) };
}
