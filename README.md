# Neorwc: Documentation Suite

![Logo](https://github.com/rkriad585/neorwc-cli/blob/main/logo/logo.svg)

![Version](https://img.shields.io/badge/Version-v3.0.0-blue.svg)
![Runtime](https://img.shields.io/badge/Runtime-Bun-purple.svg)
![Language](https://img.shields.io/badge/Language-TypeScript-blue.svg)

Neorwc is an AI-powered CLI for automating project documentation generation. Built with **Bun + TypeScript**, using **citty** for CLI parsing, **listr2** for task lists, **cli-spinners** for spinners, and **modelpedia** for AI model data.

## Features

- AI-driven documentation using local (Ollama) and cloud (Gemini) models
- Customizable persona skills and global plans
- Context-aware project scanning with intelligent file filtering
- Remote template installation from GitHub
- Persistent project state across runs
- Dry-run mode for previewing AI output

## Prerequisites

- [Bun](https://bun.sh) v1.2+ runtime
- (Optional) [Ollama](https://ollama.com) for local AI models
- (Optional) Google Gemini API key (set `NEORWC_GEMINI_KEY` env var)

## Installation

```bash
git clone https://github.com/rkriad585/neorwc-cli
cd neorwc-cli
bun install
```

## Usage

```bash
# Generate docs with default Ollama model
bun run neorwc.ts

# Use a specific skill and Gemini model
bun run neorwc.ts --skill neorwc-architect --model gemini-2.5-flash

# Initialize global config
bun run neorwc.ts --init

# List available templates
bun run neorwc.ts --templates

# Dry-run mode
bun run neorwc.ts --dry-run

# Build standalone binary
bun run build
```

## CLI Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--model` | `-m` | AI model to use (default: auto-detect) |
| `--ctx` | `-c` | Override context window size |
| `--plan` | `-p` | Use a global plan |
| `--skill` | `-s` | Use a persona skill |
| `--init` | `-n` | Initialize ~/.neorwc folder |
| `--templates` | `-t` | List remote templates |
| `--install` | `-i` | Install a template |
| `--list` | `-l` | List installed resources |
| `--dry-run` | `-d` | Scan without writing |

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict)
- **CLI:** citty
- **Task UI:** listr2
- **Spinners:** cli-spinners
- **Model DB:** modelpedia

## License

ISC
