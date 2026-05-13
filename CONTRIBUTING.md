# Contributing to neorwc

Thank you for your interest in contributing to **neorwc** (Neo Read Write Create)!

## How to Contribute

- **Report bugs** — Open a GitHub issue with steps to reproduce, expected vs actual behavior, and your environment.
- **Suggest features** — Open a GitHub issue describing the feature, use case, and how it fits the project.
- **Submit pull requests** — Fork the repo, make your changes, and open a PR against the `main` branch.

## Development Setup

```bash
git clone https://github.com/rkriad585/neorwc-cli
cd neorwc-cli
bun install
```

Run in development mode:

```bash
neorwc
```

## Project Structure

```
neorwc.ts                  # CLI entry point
src/
├── core/                  # Core logic (config, scanner, AI orchestration, TUI)
├── provider/              # AI provider implementations
└── tips/                  # Tip of the Day system
scripts/build.ts           # Standalone binary compiler
build.ps1 / build.sh       # Cross-platform build scripts
installer.ps1 / installer.sh  # One-line installers
```

## Coding Guidelines

- **TypeScript strict mode** — The project uses strict TypeScript. All code must type-check.
- **Follow existing patterns** — Match the style, conventions, and structure of surrounding code.
- **No comments in code** — The project convention is zero comments in source code. Let the code speak for itself.
- **Use Bun APIs** — Prefer Bun-native APIs (e.g., `Bun.file()`, `Bun.write()`, `Bun.spawnSync()`) over Node.js equivalents.
- **ESM only** — All imports use ESM syntax with `.ts` extensions.

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Make your changes following the coding guidelines above.
3. Run `bunx tsc --noEmit` to verify type checking.
4. Run `neorwc --help` to verify the CLI still works.
5. If adding a new feature, update relevant documentation.
6. Open a PR with a clear title and description of your changes.

## Adding a New AI Provider

1. Create `src/provider/<name>.ts` implementing the `AiProvider` interface from `src/provider/types.ts`:

```typescript
interface AiProvider {
  name: string;
  getCapabilities(modelName: string): Promise<ModelCapabilities>;
  generate(payload: GeneratePayload): Promise<string>;
}
```

2. Add the API key env var to `src/core/config.ts` (in the `KEYS` object).
3. Add the provider to `src/core/ai.ts` (import + `REGISTRY` + `PROVIDER_BY_NAME`).
4. Add the provider to `src/core/config-manager.ts` (in `GlobalConfig.apiKeys` + `saveTUIConfig`).
5. Add the provider to `src/core/config-tui.ts` (in `PROVIDERS` + `PROVIDER_LABELS` + `apiKeyConfig`).
6. Test: `neorwc --config` should show the new provider in the TUI.

## Adding New Tips

1. Create a JSON file in `src/tips/tips_template/` with the format:

```json
{
  "category": "my-category",
  "tips": ["Tip one", "Tip two", "..."]
}
```

2. Register the file in `src/tips/tips.ts`:
   - Add a static import at the top
   - Add it to `TIP_REGISTRY`
   - Add a hint to `HINTS`

Tips are statically imported at compile time, so no dynamic loading is needed.

## Building

```bash
# Standalone binary (current platform)
bun run build

# Cross-platform (all targets)
.\build.ps1        # Windows
./build.sh          # Linux / macOS

# Type check
bunx tsc --noEmit
```

## Contact

For questions or discussions, reach out to [rkriad585@gmail.com](mailto:rkriad585@gmail.com).
