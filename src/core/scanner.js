import { glob } from 'glob'
import fs from 'fs-extra'
import config from './config.js'
import path from 'path'

const estimateTokens = (text) => Math.ceil(text.length / 3.5);

const formatFile = (filePath, content) => {
  // Smart Truncation: Keep header and some logic, cut the middle if huge
  if (content.length > 8000) {
    const lines = content.split('\n');
    const head = lines.slice(0, 50).join('\n');
    const tail = lines.slice(-20).join('\n');
    return `\n\n=== FILE: ${filePath} (Partial) ===\n${head}\n...[${lines.length - 70} lines truncated]...\n${tail}\n=== END FILE ===\n`;
  }
  return `\n\n=== FILE: ${filePath} ===\n${content}\n=== END FILE ===\n`;
};

async function scanProject(rootDir) {
  const files = await glob('**/*', { 
    cwd: rootDir,
    nodir: true, 
    ignore: config.IGNORE_PATTERNS,
    dot: true 
  });

  let fullContext = `PROJECT FILES LIST:\n${files.join('\n')}\n`;
  let fileCount = 0;
  let totalChars = 0;

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootDir, file), 'utf8');
      // Simple heuristic to skip binary-looking files that slipped through
      if (content.indexOf('\0') === -1) { 
        fullContext += formatFile(file, content);
        fileCount++;
        totalChars += content.length;
      }
    } catch (err) {
      // Ignore unreadable files
    }
  }

  return {
    context: fullContext,
    fileCount,
    tokenEstimate: estimateTokens(fullContext)
  };
}

export default { scanProject };
