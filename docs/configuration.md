# Configuration

Neorwc uses a dual-layer configuration system: **Global Config** and **Project State**.

### Global Configuration
Stored in `~/.config/neostore/neorwc/config.json`. This file holds:
- API Keys (Google, OpenAI).
- Default Provider and Model preferences.
- Global Ignore Patterns (files Neorwc should never read).

### Project State
Stored in your project's `docs/.neorwc` file. This tracks:
- The last model used for this specific project.
- The last run timestamp.
- Project-specific context settings.

### The Configuration TUI
Neorwc includes a terminal-based UI to manage these settings without editing JSON files manually.
```bash
# Launch the config TUI (if implemented via --config or similar trigger)
bun run neorwc.ts --init
```
Inside the TUI, you can:
- Select your preferred AI provider.
- Browse models provided by **Modelpedia**.
- Securely input API keys.
- Manage the list of ignored file patterns.

### Environment Variables
You can also set keys via environment variables:
- `NEORWC_GOOGLE_KEY`: For Gemini models.
- `OPENAI_API_KEY`: For OpenAI models.

written by Neorwc