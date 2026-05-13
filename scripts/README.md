# scripts/

Contains `build.ts` — the standalone compilation script for neorwc.

## What it does

1. Reads the version from `.version` at the project root
2. Injects the version into `src/core/__version.ts` as `VERSION` / `VERSION_TAG`
3. Patches `blessed/lib/widget.js` with a try/catch wrapper so bun can trace dynamic requires during `--compile`
4. Runs `bun build --compile` with the requested `--target` (defaults to `bun-windows-x64`)
5. Restores the original `widget.js` and `__version.ts` after compilation
