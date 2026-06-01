# CLI Reference

## Usage

```bash
neorwc [options]
```

## Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--model` | `-m` | AI model ID (e.g., `gemini-2.5-flash`, `gpt-4o`, `claude-3-opus`) |
| `--ctx` | `-c` | Override context window size in tokens |
| `--skill` | `-s` | Use a persona skill file from skills directory |
| `--provider` | `-p` | AI provider: `google`, `openai`, `anthropic`, `deepseek`, `mistral`, `cohere`, `ollama` |
| `--init` | `-n` | Initialize config folder with default skill |
| `--templates` | `-t` | List available remote templates from GitHub |
| `--install` | `-i` | Install a template (`all` for everything) |
| `--list` | `-l` | List installed skills and available providers |
| `--dry-run` | `-d` | Scan project and run AI without writing files |
| `--config` | `-g` | Open interactive TUI for editing configuration |
| `--update` | `-u` | Self-update to the latest version |
| `--self-update` | | Same as `--update` |
| `--proxy` | | Proxy URL for self-update |
| `--selfuninstall` | | Uninstall neorwc and remove all config files |
| `--uninstall` | | Same as `--selfuninstall` |

## Examples

```bash
# Generate documentation
neorwc

# Use a specific provider and model
neorwc --provider openai --model gpt-4o

# Dry-run (preview without writing)
neorwc --dry-run

# Use a persona skill
neorwc --skill technical-writer

# Open configuration TUI
neorwc --config

# Self-update
neorwc --update

# Self-uninstall
neorwc --selfuninstall
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (config missing, API failure, etc.) |
