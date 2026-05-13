# System Architecture

Neorwc is modularly designed to handle various AI providers and complex project structures.

### 1. The Scanner (`src/core/scanner.ts`)
The scanner uses `Bun.Glob` for high-performance file discovery. It filters files based on `IGNORE_PATTERNS` and reads text content. To prevent context overflow, it truncates files longer than 8,000 characters, providing the "Head" and "Tail" of the file to the AI.

### 2. Provider Layer (`src/provider/`)
Neorwc abstracts AI communication through a common `AiProvider` interface:
- **Google Provider**: Connects to the Gemini API.
- **OpenAI Provider**: Connects to the GPT-4/o1 family of models.
- **Ollama Provider**: Connects to a local `localhost:11434` instance.

### 3. AI Core (`src/core/ai.ts`)
This module handles the prompt engineering. It wraps your project context in a system prompt that instructs the AI to use a specific XML-like tagging format:
`<<<FILENAME: path/to/file.md>>> content