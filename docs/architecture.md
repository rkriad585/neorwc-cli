# System Architecture

neorwc is modularly designed to handle multiple AI providers and complex project structures.

**Author:** RK Riad Khan ([rkriad585@gmail.com](mailto:rkriad585@gmail.com))  
**GitHub:** [github.com/rkriad585/neorwc-cli](https://github.com/rkriad585/neorwc-cli)

### 1. Entry Point (`neorwc.ts`)
The main CLI entry point. Uses **citty** for argument parsing. Handles standalone flags (`--config`, `--update`, `--selfuninstall`, `--init`, `--templates`, `--install`, `--list`) and the main documentation generation flow. Imports the tip system as a side-effect for the startup banner.

### 2. The Scanner (`src/core/scanner.ts`)
Uses `Bun.Glob` for high-performance file discovery. Filters files based on ignore patterns and reads text content. Truncates files longer than 8,000 characters (provides "Head" and "Tail") to prevent context overflow.

### 3. Provider Layer (`src/provider/`)
Abstracts AI communication through a common `AiProvider` interface. Supports 7 providers:
- **Google** (`google.ts`) — Gemini API
- **OpenAI** (`openai.ts`) — GPT-4 / o1 family
- **Anthropic** (`anthropic.ts`) — Claude models
- **DeepSeek** (`deepseek.ts`) — DeepSeek models
- **Mistral** (`mistral.ts`) — Mistral models
- **Cohere** (`cohere.ts`) — Command-R models
- **Ollama** (`ollama.ts`) — Local `localhost:11434` instance

### 4. AI Core (`src/core/ai.ts`)
Handles prompt engineering and provider resolution. Wraps project context in a system prompt instructing the AI to use an XML-like tagging format (`<<<FILENAME: path/to/file.md>>>`). Resolves provider by explicit `--provider` flag or auto-detects from model name prefix via `REGISTRY`.

### 5. Config System (`src/core/config-tui.ts` + `src/core/config-manager.ts`)
Two-layer configuration:
- **Global config** at `~/.config/neostore/neorwc/config.json`
- **Project state** at `docs/.neorwc`
- The **Config TUI** (`--config` / `-g`) is built with **blessed** and lets users select provider, model, enter API keys, and manage ignore patterns interactively.

### 6. Template System (`src/core/templates.ts`)
Lists and installs documentation templates from GitHub using **modelpedia** for model discovery.

### 7. Tip System (`src/tips/`)
Displays a "Tip of the Day" banner on every startup using **boxen** and **chalk**. Contains 20+ tip categories (neorwc, bun, git, typescript, json, nodejs, cli, security, performance, markdown, design, debugging, testing, css, python, docker, linux, npm, api, database).

### 8. Installer & Self-Management
- `installer.ps1` / `installer.sh` — one-liner install/uninstall scripts
- `--selfuninstall` — removes binary, config, and PATH entries
- `--update` / `-u` — fetches latest GitHub release and replaces the current binary
- `scripts/build.ts` — builds standalone binaries with version injection
- `build.ps1` / `build.sh` — cross-platform build scripts outputting to `bin/`