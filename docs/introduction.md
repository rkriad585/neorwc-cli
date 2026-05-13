# Introduction to neorwc

**neorwc** (Neo Read Write Create) is a high-performance, AI-powered CLI that automates project documentation generation. Built for the **Bun** runtime with **TypeScript**, neorwc leverages Large Language Models (LLMs) to analyze your codebase and generate structured documentation.

**Author:** RK Riad Khan ([rkriad585@gmail.com](mailto:rkriad585@gmail.com))  
**GitHub:** [github.com/rkriad585/neorwc-cli](https://github.com/rkriad585/neorwc-cli)

### Core Philosophy
Neorwc operates on a "Scan-Analyze-Write" cycle:
1.  **Scan**: Context-aware project scan respecting `.gitignore` and custom ignore patterns.
2.  **Analyze**: Feeds project structure and file contents into an AI model.
3.  **Write**: Parses the AI response to generate documentation files.

### Key Features
- **7 AI Providers**: google, openai, anthropic, deepseek, mistral, cohere, and ollama.
- **Persona Skills**: Specialized skill files that change the tone and focus of documentation.
- **Config TUI**: Interactive terminal UI launched via `--config` / `-g` for managing provider, model, and API keys.
- **Template System**: Install and list community documentation templates from GitHub.
- **Tip System**: Random "Tip of the Day" on every startup — 20+ categories including neorwc, bun, git, typescript, and more.
- **Self-Update & Self-Uninstall**: `--update` / `-u` fetches the latest GitHub release; `--selfuninstall` removes neorwc and all config.
- **Installer Scripts**: One-liner install via `installer.ps1` (Windows) or `installer.sh` (Linux/macOS).
- **Standalone Binary**: Compile to a single executable via `bun run scripts/build.ts --target=<target>`.
- **Context Management**: Intelligent file truncation and token estimation to fit large projects into LLM context windows.