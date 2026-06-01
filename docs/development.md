# Development Guide

## Project Structure

```
neorwc.ts                  # CLI entry point
src/
├── core/
│   ├── ai.ts             # Provider resolution, prompt engineering, file writing
│   ├── config.ts         # Constants, API URLs, ignore patterns
│   ├── config-manager.ts # Global config CRUD
│   ├── config-tui.ts     # Interactive config wizard (@clack/prompts)
│   ├── scanner.ts        # Project file scanner
│   ├── state.ts          # Per-project state persistence
│   ├── templates.ts      # Remote template fetching
│   └── __version.ts      # Auto-generated at build time
├── provider/
│   ├── types.ts          # AiProvider interface
│   ├── google.ts
│   ├── openai.ts
│   ├── anthropic.ts
│   ├── deepseek.ts
│   ├── mistral.ts
│   ├── cohere.ts
│   └── ollama.ts
└── tips/
    ├── tips.ts           # Tip system
    ├── index.ts          # Side-effect import
    └── tips_template/    # JSON tip files
```

## Coding Conventions

- **TypeScript strict mode** — all code must type-check with `bunx tsc --noEmit`
- **No comments** — let the code speak for itself
- **ESM only** — use `.ts` extensions in imports
- **Prefer Bun APIs** — `Bun.file()`, `Bun.write()`, `Bun.spawnSync()` over Node.js equivalents
- **Follow existing patterns** — match the style of surrounding code

## Adding a New AI Provider

1. Create `src/provider/<name>.ts` implementing `AiProvider` from `types.ts`
2. Add API key env var to `src/core/config.ts` (in `KEYS` object)
3. Add provider to `src/core/ai.ts` (import + REGISTRY + PROVIDER_BY_NAME)
4. Add provider to `src/core/config-manager.ts`
5. Add provider to `src/core/config-tui.ts`
6. Test with `neorwc --config`

## Adding New Tips

1. Create a JSON file in `src/tips/tips_template/`
2. Register it in `src/tips/tips.ts` (static import + TIP_REGISTRY + HINTS)

## Testing

```bash
# Type check
bunx tsc --noEmit

# Run the CLI in dry-run mode on a test project
neorwc --dry-run

# Verify CLI help
neorwc --help
```

There are no formal test suites yet. Testing is done manually by running the CLI on sample projects.
