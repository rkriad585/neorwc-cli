# neorwc

![Logo](logo/logo.svg)

![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Frkriad585%2Fneorwc-cli%2Fmain%2F.version&query=%24&prefix=v&label=Version&color=blue)
![Runtime](https://img.shields.io/badge/Runtime-Bun-purple.svg)
![Language](https://img.shields.io/badge/Language-TypeScript-blue.svg)

**neorwc** (Neo Read Write Create) is an AI-powered CLI that automates project documentation generation. Built with **Bun + TypeScript**, using **citty** for CLI parsing, **listr2** for task lists, **cli-spinners** for spinners, **boxen** + **chalk** for styled output, and **modelpedia** for AI model data.

**Author:** RK Riad Khan ([rkriad585@gmail.com](mailto:rkriad585@gmail.com))  
**GitHub:** [github.com/rkriad585/neorwc-cli](https://github.com/rkriad585/neorwc-cli)

## Features

- AI-driven documentation using 7 providers: google, openai, anthropic, deepseek, mistral, cohere, ollama
- Customizable persona skills
- Context-aware project scanning with intelligent file filtering
- Remote template installation from GitHub
- Interactive config TUI (`--config` / `-g`)
- Persistent project state across runs
- Dry-run mode for previewing AI output
- Tip of the Day system (20+ categories)
- Self-update (`--update` / `-u`) and self-uninstall (`--selfuninstall`)
- Installer scripts for Windows (PowerShell) and Linux/macOS (Shell)
- Standalone binary compilation via `bun run scripts/build.ts --target=<target>`

## Prerequisites

- [Bun](https://bun.sh) v1.2+ runtime
- (Optional) [Ollama](https://ollama.com) for local AI models
- (Optional) API keys — see [Configuration](docs/configuration.md) for env var names

## Quick Install

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.ps1 | iex
```

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.sh | sh
```

## Usage

```bash
# Generate docs with default model
bun run neorwc.ts

# Use a specific provider and model
bun run neorwc.ts --provider google --model gemini-2.5-flash

# Use a persona skill
bun run neorwc.ts --skill neorwc-architect

# Open the config TUI
bun run neorwc.ts --config

# Initialize global config
bun run neorwc.ts --init

# List available templates from GitHub
bun run neorwc.ts --templates

# Install a template
bun run neorwc.ts --install neorwc-architect

# Dry-run mode
bun run neorwc.ts --dry-run

# Self-update or self-uninstall
bun run neorwc.ts --update
bun run neorwc.ts --selfuninstall
```

## CLI Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--model` | `-m` | AI model to use |
| `--ctx` | `-c` | Override context window size |
| `--skill` | `-s` | Use a persona skill |
| `--provider` | `-p` | AI provider (google, openai, anthropic, deepseek, mistral, cohere, ollama) |
| `--init` | `-n` | Initialize `~/.config/neostore/neorwc` folder |
| `--templates` | `-t` | List remote templates |
| `--install` | `-i` | Install a template |
| `--list` | `-l` | List installed resources |
| `--dry-run` | `-d` | Scan without writing |
| `--config` | `-g` | Open interactive config TUI |
| `--update` | `-u` | Self-update from GitHub releases |
| `--selfuninstall` | | Uninstall neorwc and remove all config files |

## Building a Standalone Binary

```bash
# Build for current platform
bun run scripts/build.ts

# Build for a specific target
bun run scripts/build.ts --target=bun-linux-x64
```

Cross-platform builds via `build.ps1` / `build.sh` output to `bin/` folder.

## Config Paths

| Path | Purpose |
|------|---------|
| `~/.config/neostore/neorwc/config.json` | Global configuration (provider, model, API keys) |
| `~/.config/neostore/neorwc/skills/` | Installed persona skills |
| `docs/.neorwc` | Per-project state file |

## Environment Variables

| Variable | Provider |
|----------|----------|
| `NEORWC_GOOGLE_KEY` | Google (Gemini) |
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `DEEPSEEK_API_KEY` | DeepSeek |
| `MISTRAL_API_KEY` | Mistral |
| `COHERE_API_KEY` | Cohere |

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict)
- **CLI:** citty
- **Task UI:** listr2
- **Spinners:** cli-spinners
- **Styling:** boxen, chalk
- **Model DB:** modelpedia

## License

ISC
