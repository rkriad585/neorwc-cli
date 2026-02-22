# Neorwc: Documentation Suite

![Logo](https://github.com/rkriad585/neorwc-cli/blob/main/logo/logo.svg)

![Version](https://img.shields.io/badge/Version-v3.3.0-blue.svg)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow.svg)
![License](https://img.shields.io/badge/License-Unspecified-lightgrey.svg)

Neorwc is an AI-powered command-line interface designed to automate and streamline the generation of comprehensive project documentation.

## Features

*   **AI-Driven Documentation:** Leverages advanced AI models (Ollama, Google Gemini) for high-quality output.
*   **Multi-Model Support:** Seamlessly switch between local (Ollama) and cloud (Gemini) AI providers.
*   **Customizable Generation:** Apply global plans and specific persona skills to tailor documentation output.
*   **Context-Aware Scanning:** Intelligently scans project files, estimates token usage, and provides relevant context to the AI.
*   **Template Management:** Initialize, list, and install remote documentation templates (plans and skills) from a GitHub repository.
*   **Project State Management:** Persists project-specific settings and documentation state in a `.neorwc` file.
*   **Dry-Run Mode:** Preview the AI's scanning and planning without writing any files.

## Installation

To get started with Neorwc, you can install it globally via npm or link it for local development:

```bash
# Install globally (if published to npm)
npm install -g neorwc

# Or, for local development/linking:
# After cloning the repository and navigating to its root:
npm install
npm link
```

## Usage Example

Here are a few examples of how to use the `neorwc` CLI:

```bash
# Generate documentation using a specific skill, plan, and Gemini model
neorwc -s neorwc-architect --plan usage-examples --model gemini-1.5-flash

# Generate documentation using a specific model (e.g., Ollama's default)
neorwc --model llama3

# Run with default settings (Ollama model, no specific plan/skill)
neorwc
```

## License

This project is currently under an unspecified license. Please refer to the project's repository for licensing details.

written by Neorwc
