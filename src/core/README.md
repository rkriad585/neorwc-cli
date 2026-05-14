# src/core/

Core application logic — configuration, TUI, file scanning, state, templates, and AI orchestration.

## Files

| File | Description |
|------|-------------|
| `__version.ts` | Auto-generated version constants (`VERSION`, `VERSION_TAG`), injected by `scripts/build.ts` |
| `ai.ts` | AI provider resolution, prompt engineering, and file parsing orchestration |
| `config.ts` | Application constants and defaults |
| `config-manager.ts` | Global config CRUD — reads/writes config from `~/.config/neorwc/` |
 | `config-tui.ts` | Interactive configuration wizard built with @clack/prompts |
| `scanner.ts` | `Bun.Glob`-based file scanner for project analysis |
| `state.ts` | Per-project state tracking (last run, providers used, etc.) |
| `templates.ts` | GitHub API integration for template management and syncing |
