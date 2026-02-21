import fs from 'fs-extra'
import config from './config.js'
import path from 'path'

// We store state in docs/.neorwc
const STATE_DIR = path.join(process.cwd(), config.DOCS_DIR_ROOT);
const STATE_FILE = path.join(STATE_DIR, '.neorwc');

async function loadState() {
  try {
    if (await fs.pathExists(STATE_FILE)) {
      return await fs.readJson(STATE_FILE);
    }
  } catch (e) {
    // Ignore read errors
  }
  return {};
}

async function saveState(data) {
  try {
    await fs.ensureDir(STATE_DIR);
    // Merge existing state with new data
    const current = await loadState();
    const newState = { ...current, ...data, lastUpdated: new Date().toISOString() };
    await fs.writeJson(STATE_FILE, newState, { spaces: 2 });
  } catch (e) {
    console.error('Warning: Could not save project state.');
  }
}

export default { loadState, saveState };
