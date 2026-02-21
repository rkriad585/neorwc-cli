import path from 'path';
import os from 'os';

const HOME_DIR = os.homedir();
const GLOBAL_ROOT = path.join(HOME_DIR, '.neorwc');

const MODEL_ID = 3;
const URL = "http://localhost:11434/api/tags";

async function getModels() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(URL, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      // return data["models"][3]["name"];
      return data.models?.[MODEL_ID]?.name ?? "Model not found";
    } else {
      return [];
    }
  } catch (error) {
    return "error: Ollama Down";
  }
}

export default {

  // 1. Ollama (Local)
  OLLAMA_API: 'http://localhost:11434/api/generate',
  OLLAMA_SHOW_API: 'http://localhost:11434/api/show',
  DEFAULT_MODEL: await getModels(),
  DOCS_DIR_ROOT: 'docs',
  CONTEXT_FILE: 'neorwc.md',
  
  // 2. Google Gemini (Cloud)
  GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
  GEMINI_DEFAULT_MODEL: 'gemini-1.5-flash', // Fast, cheap, 1M context
  
  // --- API Keys (Load from ENV) ---
  // You should set this in your terminal: export GEMINI_API_KEY="AIza..."
  KEYS: {
    GEMINI: process.env.NEORWC_GEMINI_KEY || null,
  },
  
  // GitHub Configuration
  REPO_OWNER: 'rkriad585',
  REPO_NAME: 'neorwc-templates',
  GITHUB_API_BASE: 'https://api.github.com/repos/rkriad585/neorwc-templates/contents',
  GITHUB_RAW_BASE: 'https://raw.githubusercontent.com/rkriad585/neorwc-templates/main',
  
  // Paths
  GLOBAL_PATHS: {
    ROOT: GLOBAL_ROOT,
    PLANS: path.join(GLOBAL_ROOT, 'plans'),
    SKILLS: path.join(GLOBAL_ROOT, 'skills')
  },
  
  COLORS: {
    primary: '#00D8FF',
    secondary: '#FF0055',
    success: '#00FF99',
    info: '#FFA500', 
    warning: '#FFCC00'
  },

  IGNORE_PATTERNS: [
    '**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.config/**',
    '**/coverage/**', '**/.next/**', '**/.vscode/**', '**/.idea/**', '**/.gitconfig',
    '**/*.lock', '**/*.log', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/.local/**',
    '**/*.gif', '**/*.ico', '**/*.svg', '**/*.mp4', '**/*.zip', '**/.cargo/**',
    '**/*.tar', '**/*.gz', '**/*.json', '**/.claude/**', '**/.cache/**', // Ignore JSONs to save tokens usually
    '**/docs/**', 'neorwc.md', '**/.neorwc/**', '**/.npm/**', '**/.npmrc',
    '**/.ollama/**', '**/.python_history', '**/.termux/**', '**/.ssh/**', 
    '**/.termux_authinfo', '**/.zshrc', '**/.bashrc', '**/__pycache__/**',
    '**/*.mod', '**/*.sum', '**/pyproject.toml', '**/*.gitignore',
  ]
};