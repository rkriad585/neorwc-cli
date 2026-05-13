# Installation Guide

neorwc offers multiple installation methods. The project is built for the **Bun** runtime and can also be compiled into standalone binaries.

**Author:** RK Riad Khan ([rkriad585@gmail.com](mailto:rkriad585@gmail.com))  
**GitHub:** [github.com/rkriad585/neorwc-cli](https://github.com/rkriad585/neorwc-cli)

### Prerequisites
- **Bun**: v1.2 or higher (for source usage or building).
- **Ollama** (Optional): For running local AI models.
- **API Keys** (Optional): For cloud providers — see [Configuration](configuration.md).

### Quick Install (One-liner)

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.ps1 | iex
```

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.sh | sh
```

The installer downloads the latest pre-built binary from GitHub releases, places it in `~/.config/neostore/neorwc/bin/`, and adds it to your PATH.

### Source Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/rkriad585/neorwc-cli
   cd neorwc-cli
   ```

2. **Install Dependencies**:
   ```bash
   bun install
   ```

3. **Initialize Configuration**:
   ```bash
   bun run neorwc.ts --init
   ```
   This creates `~/.config/neostore/neorwc/` with a default skill.

### Building a Standalone Binary

Build for the current platform:
```bash
bun run scripts/build.ts
```

Build for a specific target:
```bash
bun run scripts/build.ts --target=bun-linux-x64
```

Cross-platform builds (all 5 targets):
```powershell
# Windows
.\build.ps1

# Linux / macOS
./build.sh
```

Output binaries are saved to the `bin/` folder (e.g., `neorwc-windows-amd64.exe`, `neorwc-linux-amd64`).

### Self-Update

If installed via the installer or a standalone binary:
```bash
neorwc --update
# or
neorwc -u
```
This fetches the latest release from GitHub and replaces the current binary.

### Self-Uninstall

```bash
neorwc --selfuninstall
```
Removes the binary, config folder (`~/.config/neostore/neorwc`), and cleans PATH entries.