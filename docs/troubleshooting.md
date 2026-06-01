# Troubleshooting

## Common Issues

### "Failed to fetch latest version" during self-update

**Cause:** No internet connection or GitHub is unreachable.

**Fix:** Check your internet connection and try again. If behind a proxy, use the `--proxy` flag:

```bash
neorwc --update --proxy http://proxy:8080
```

### "No API key found" error

**Cause:** The selected provider requires an API key that isn't configured.

**Fix:** Set the environment variable or use the config TUI:

```bash
# Set env var (replace with your key)
export NEORWC_GOOGLE_KEY=your_key_here

# Or use the TUI
neorwc --config
```

### "Provider returned an error" during generation

**Cause:** The AI provider API returned an error (rate limit, invalid request, model unavailable).

**Fix:**
1. Check your API key is valid
2. Try a different model: `neorwc --model gpt-4o-mini`
3. Try a different provider: `neorwc --provider google`
4. Check the provider's status page for outages

### Binary won't run on Linux

**Cause:** Missing execute permissions or missing dependencies.

**Fix:**

```bash
chmod +x neorwc-linux-amd64
./neorwc-linux-amd64
```

If you get a "not found" error on a musl-based system (Alpine), ensure the binary was compiled with the correct target.

### "Command not found" after installation

**Cause:** The binary directory is not in your PATH, or you need to restart your terminal.

**Fix:**
1. Restart your terminal
2. Or add the directory manually:
   ```bash
   export PATH="$PATH:$HOME/.config/neostore/neorwc/bin"
   ```

### Docker build fails with "bun: not found"

**Cause:** The Docker build requires the Bun runtime image.

**Fix:** Ensure you have the correct base image in Dockerfile (`oven/bun:1.2`). If using a proxy, configure Docker to use it:

```bash
docker build --build-arg HTTP_PROXY=http://proxy:8080 -t neorwc .
```

### Windows: "Execution Policy" error

**Cause:** PowerShell execution policy prevents running scripts.

**Fix:**

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Or use the installer with bypass:

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.ps1 | iex"
```

## Getting Help

If you can't find a solution, open a GitHub issue at:
https://github.com/rkriad585/neorwc-cli/issues
