# Configuration

neorwc uses a dual-layer configuration system: **Global Config** and **Project State**.

**Author:** RK Riad Khan ([rkriad585@gmail.com](mailto:rkriad585@gmail.com))  
**GitHub:** [github.com/rkriad585/neorwc-cli](https://github.com/rkriad585/neorwc-cli)

### Global Configuration
Stored in `~/.config/neostore/neorwc/config.json`. This file holds:
- API Keys for all providers.
- Default Provider and Model preferences.
- Context window size.
- Global Ignore Patterns (files neorwc should never read).

### Project State
Stored in your project's `docs/.neorwc` file. This tracks:
- The last model and provider used for this specific project.
- The last run timestamp.
- Project-specific context settings.

### The Configuration TUI
neorwc includes an interactive configuration wizard (built with **@clack/prompts**) to manage settings without editing JSON manually.
```bash
# Launch the config TUI
bun run neorwc.ts --config
# or
bun run neorwc.ts -g
```
Inside the TUI, you can:
- Select your preferred AI provider from: google, openai, anthropic, deepseek, mistral, cohere, ollama.
- Browse models provided by **Modelpedia**.
- Securely input API keys.
- Set default model and context window.
- Manage the list of ignored file patterns.

### Environment Variables
You can also set API keys via environment variables (these take precedence):

| Variable | Provider |
|----------|----------|
| `NEORWC_GOOGLE_KEY` | Google (Gemini) |
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `DEEPSEEK_API_KEY` | DeepSeek |
| `MISTRAL_API_KEY` | Mistral |
| `COHERE_API_KEY` | Cohere |