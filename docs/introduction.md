# Introduction to Neorwc

Neorwc is a high-performance, AI-powered documentation suite designed to automate the creation of project documentation. Built specifically for the **Bun** runtime using **TypeScript**, Neorwc leverages Large Language Models (LLMs) to analyze your codebase and generate structured, meaningful documentation.

### Core Philosophy
Neorwc operates on a "Scan-Analyze-Write" cycle:
1.  **Scan**: It performs a context-aware scan of your project, respecting `.gitignore` and custom ignore patterns.
2.  **Analyze**: It feeds the project structure and file contents into an AI model (local or cloud-based).
3.  **Write**: It parses the AI's response to generate multiple documentation files simultaneously.

### Key Features
- **Multi-Provider Support**: Seamlessly switch between local models (Ollama) and cloud APIs (Google Gemini, OpenAI).
- **Persona Skills**: Use specialized "skills" to change the tone and focus of the documentation (e.g., Architect, Developer, or End-user focus).
- **Interactive TUI**: A built-in Terminal User Interface for managing API keys, default models, and ignore patterns.
- **Context Management**: Intelligent file truncation and token estimation to fit large projects into LLM context windows.
- **Template System**: Install community-driven documentation templates directly from GitHub.

written by Neorwc