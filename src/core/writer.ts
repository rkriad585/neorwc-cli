import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { config } from "./config.ts";

// parse AI output into individual files using <<<FILENAME:...>>> delimiters
export async function parseAndWrite(
  aiOutput: string,
  rootDir: string
): Promise<string[]> {
  const fileRegex = /<<<FILENAME:\s*(.+?)>>>([\s\S]*?)<<<END>>>/g;
  const createdFiles: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = fileRegex.exec(aiOutput)) !== null) {
    let relativePath = match[1].trim();
    const content = match[2].trim();

    // enforce docs/ root prefix
    if (!relativePath.startsWith(config.DOCS_DIR_ROOT)) {
      relativePath = join(config.DOCS_DIR_ROOT, relativePath);
    }

    const fullPath = join(rootDir, relativePath);
    await mkdir(join(fullPath, ".."), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
    createdFiles.push(relativePath);
  }

  return createdFiles;
}
