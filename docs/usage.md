# Usage and CLI Reference

Neorwc provides a flexible CLI interface for generating documentation.

### Basic Generation
Generate documentation using the default model (Gemini 2.5 Flash):
```bash
bun run neorwc.ts
```

### Using Specific Models
You can specify a model from Ollama, OpenAI, or Google:
```bash
# Use a local Ollama model
bun run neorwc.ts --model llama3

# Use an OpenAI model
bun run neorwc.ts --model gpt-4o
```

### Skills and Templates
Skills define the "persona" of the AI writer.
```bash
# List available remote templates
bun run neorwc.ts --templates

# Install a specific skill
bun run neorwc.ts --install neorwc-architect

# Use an installed skill
bun run neorwc.ts --skill neorwc-architect
```

### CLI Flags Reference

| Flag | Alias | Description |
|------|-------|-------------|
| `--model` | `-m` | Specify the AI model ID. |
| `--skill` | `-s` | Use a specific persona skill file. |
| `--dry-run`| `-d` | Scan and prompt the AI, but do not write files to disk. |
| `--ctx`   | `-c` | Override the default context window size (tokens). |
| `--init`  | `-n` | Initialize global config and skill folders. |
| `--list`  | `-l` | List installed skills and active providers. |

written by Neorwc