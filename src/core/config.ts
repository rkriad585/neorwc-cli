import { join } from "node:path";
import { homedir } from "node:os";

const HOME_DIR = homedir();
const GLOBAL_ROOT = join(HOME_DIR, ".config/neostore/neorwc");

const DEFAULT_MODEL = "gemini-2.5-flash";

export const IGNORE_PATTERNS = [
  "**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.config/**",
  "**/coverage/**", "**/.next/**", "**/.vscode/**", "**/.idea/**", "**/.gitconfig",
  "**/*.lock", "**/*.log", "**/*.png", "**/*.jpg", "**/*.jpeg", "**/.local/**",
  "**/*.gif", "**/*.ico", "**/*.svg", "**/*.mp4", "**/*.zip", "**/.cargo/**",
  "**/*.tar", "**/*.gz", "**/*.json", "**/.claude/**", "**/.cache/**",
  "**/docs/**", "neorwc.md", "**/.neorwc/**", "**/.npm/**", "**/.npmrc",
  "**/.ollama/**", "**/.python_history", "**/.termux/**", "**/.ssh/**",
  "**/.termux_authinfo", "**/.zshrc", "**/.bashrc", "**/__pycache__/**",
  "**/*.mod", "**/*.sum", "**/pyproject.toml", "**/*.gitignore",
];

export const config = {
  OLLAMA_API: "http://localhost:11434/api/generate" as const,
  OLLAMA_SHOW_API: "http://localhost:11434/api/show" as const,
  DEFAULT_MODEL,

  DOCS_DIR_ROOT: "docs" as const,
  CONTEXT_FILE: "neorwc.md" as const,

  GEMINI_API_BASE: "https://generativelanguage.googleapis.com/v1beta/models" as const,
  GEMINI_DEFAULT_MODEL: "gemini-2.5-flash" as const,

  OPENAI_API_BASE: "https://api.openai.com/v1/chat/completions" as const,
  ANTHROPIC_API_BASE: "https://api.anthropic.com/v1/messages" as const,
  DEEPSEEK_API_BASE: "https://api.deepseek.com/v1/chat/completions" as const,
  MISTRAL_API_BASE: "https://api.mistral.ai/v1/chat/completions" as const,
  COHERE_API_BASE: "https://api.cohere.ai/v1/chat" as const,

  KEYS: {
    GOOGLE: process.env.NEORWC_GOOGLE_KEY ?? null,
    OPENAI: process.env.OPENAI_API_KEY ?? null,
    ANTHROPIC: process.env.ANTHROPIC_API_KEY ?? null,
    DEEPSEEK: process.env.DEEPSEEK_API_KEY ?? null,
    MISTRAL: process.env.MISTRAL_API_KEY ?? null,
    COHERE: process.env.COHERE_API_KEY ?? process.env.CO_API_KEY ?? null,
  } as const,

  REPO_OWNER: "rkriad585" as const,
  REPO_NAME: "neorwc-templates" as const,
  GITHUB_API_BASE: "https://api.github.com/repos/rkriad585/neorwc-templates/contents" as const,
  GITHUB_RAW_BASE: "https://raw.githubusercontent.com/rkriad585/neorwc-templates/main" as const,

  GLOBAL_PATHS: {
    ROOT: GLOBAL_ROOT,
    SKILLS: join(GLOBAL_ROOT, "skills"),
  } as const,

  COLORS: {
    primary: "#00D8FF",
    secondary: "#FF0055",
    success: "#00FF99",
    info: "#FFA500",
    warning: "#FFCC00",
  } as const,

  IGNORE_PATTERNS,
} as const;

export type Config = typeof config;
