import fs from 'fs-extra'
import config from './config.js'
import path from 'path'
import chalk from 'chalk'

async function parseAndWrite(aiOutput, rootDir) {
  const fileRegex = /<<<FILENAME:\s*(.+?)>>>([\s\S]*?)<<<END>>>/g;
  let match;
  let filesWritten = 0;
  const createdFiles = [];

  while ((match = fileRegex.exec(aiOutput)) !== null) {
    let relativePath = match[1].trim();
    const content = match[2].trim();

    // Enforce docs root
    if (!relativePath.startsWith(config.DOCS_DIR_ROOT)) {
      relativePath = path.join(config.DOCS_DIR_ROOT, relativePath);
    }

    const fullPath = path.join(rootDir, relativePath);
    
    await fs.outputFile(fullPath, content);
    createdFiles.push(relativePath);
    filesWritten++;
  }

  return createdFiles;
}

export default { parseAndWrite };
