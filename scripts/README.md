# scripts/

Contains `build.ts` — the standalone compilation script for neorwc.

## What it does

1. Reads the version from `.version` at the project root
2. Injects the version into `src/core/__version.ts` as `VERSION` / `VERSION_TAG`
3. Runs `bun build --compile` with the requested `--target` (defaults to `bun-windows-x64`)
4. Restores the original `__version.ts` after compilation
