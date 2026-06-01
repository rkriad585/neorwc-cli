import { join } from "node:path";
import { config } from "./config.ts";

export interface ScanResult {
  context: string;
  fileCount: number;
  tokenEstimate: number;
}

// rough token estimate: ~3.5 chars per token
const estimateTokens = (text: string): number => Math.ceil(text.length / 3.5);

// truncate massive files to keep within context limits
function formatFile(filePath: string, content: string): string {
  if (content.length > 8000) {
    const lines = content.split("\n");
    const head = lines.slice(0, 50).join("\n");
    const tail = lines.slice(-20).join("\n");
    return `\n\n=== FILE: ${filePath} (Partial) ===\n${head}\n...[${lines.length - 70} lines truncated]...\n${tail}\n=== END FILE ===\n`;
  }
  return `\n\n=== FILE: ${filePath} ===\n${content}\n=== END FILE ===\n`;
}

export async function scanProject(rootDir: string, ignorePatterns?: string[]): Promise<ScanResult> {
  if (typeof Bun === "undefined") {
    throw new Error("neorwc requires Bun runtime to scan files.");
  }
  // use Bun's native glob for fast recursive file listing
  const glob = new Bun.Glob("**/*");
  const allFiles = await Array.fromAsync(glob.scan({ cwd: rootDir, dot: true }));

  // filter files against ignore patterns (custom or default)
  const patterns = ignorePatterns ?? config.IGNORE_PATTERNS;
  const files = allFiles.filter((file) => {
    for (const pattern of patterns) {
      const parts = pattern.replace(/\*\*/g, "").split("/").filter(Boolean);
      if (parts.every((p) => file.includes(p))) return false;
    }
    return true;
  });

  let fullContext = `PROJECT FILES LIST:\n${files.join("\n")}\n`;
  let fileCount = 0;

  for (const file of files) {
    try {
      const content = await Bun.file(join(rootDir, file)).text();
      // skip binary-looking files that slipped through glob (null-byte check)
      if (!content.includes("\0")) {
        fullContext += formatFile(file, content);
        fileCount++;
      }
    } catch {
      // skip unreadable files (permission denied, binary, etc.)
    }
  }

  return { context: fullContext, fileCount, tokenEstimate: estimateTokens(fullContext) };
}
