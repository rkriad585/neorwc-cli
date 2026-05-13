# Installation Guide

Neorwc is built for the Bun runtime. Ensure you have Bun installed on your system before proceeding.

### Prerequisites
- **Bun**: v1.2 or higher.
- **Ollama** (Optional): For running local models.
- **API Keys** (Optional): For Google Gemini or OpenAI models.

### Setup
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
   Run the initialization command to set up your global configuration folder (`~/.config/neostore/neorwc`):
   ```bash
   bun run neorwc.ts --init
   ```

### Building a Standalone Binary
If you prefer to use Neorwc as a global system command, you can compile it into a single executable:
```bash
# For Windows
bun run build

# For Linux/Mac
bun run build:linux
# or
bun run build:mac
```

written by Neorwc