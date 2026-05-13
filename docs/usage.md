# Usage and CLI Reference

neorwc provides a flexible CLI interface for AI-powered documentation generation.

**Author:** RK Riad Khan ([rkriad585@gmail.com](mailto:rkriad585@gmail.com))  
**GitHub:** [github.com/rkriad585/neorwc-cli](https://github.com/rkriad585/neorwc-cli)

### Basic Generation
Generate documentation using the default model (from config or auto-detect):
```bash
bun run neorwc.ts
```

### Provider and Model Selection
Specify any of the 7 supported providers and any model from that provider:
```bash
# Google (Gemini)
bun run neorwc.ts --provider google --model gemini-2.5-flash

# OpenAI
bun run neorwc.ts --provider openai --model gpt-4o

# Anthropic
bun run neorwc.ts --provider anthropic --model claude-3-opus

# DeepSeek
bun run neorwc.ts --provider deepseek --model deepseek-coder

# Mistral
bun run neorwc.ts --provider mistral --model mistral-large

# Cohere
bun run neorwc.ts --provider cohere --model command-r

# Ollama (local)
bun run neorwc.ts --provider ollama --model llama3
```

### Skills and Templates
Skills define the "persona" of the AI writer.
```bash
# List available remote templates from GitHub
bun run neorwc.ts --templates

# Install a specific skill
bun run neorwc.ts --install neorwc-architect

# Use an installed skill
bun run neorwc.ts --skill neorwc-architect
```

### Config TUI
Launch the interactive terminal UI to manage provider, model, API keys, and ignore patterns:
```bash
bun run neorwc.ts --config
# or
bun run neorwc.ts -g
```

### Self-Update and Self-Uninstall
```bash
# Update to the latest version
bun run neorwc.ts --update

# Remove neorwc and all config files
bun run neorwc.ts --selfuninstall
```

### CLI Flags Reference

| Flag | Alias | Description |
|------|-------|-------------|
| `--model` | `-m` | AI model ID to use |
| `--ctx` | `-c` | Override context window size (tokens) |
| `--skill` | `-s` | Use a specific persona skill file |
| `--provider` | `-p` | AI provider (google, openai, anthropic, deepseek, mistral, cohere, ollama) |
| `--init` | `-n` | Initialize `~/.config/neostore/neorwc` folder |
| `--templates` | `-t` | List remote templates from GitHub |
| `--install` | `-i` | Install a template (use `"all"` for everything) |
| `--list` | `-l` | List installed skills and model providers |
| `--dry-run` | `-d` | Scan and prompt AI but do not write files |
| `--config` | `-g` | Open interactive config TUI |
| `--update` | `-u` | Self-update from GitHub releases |
| `--selfuninstall` | | Uninstall neorwc and remove all config files |