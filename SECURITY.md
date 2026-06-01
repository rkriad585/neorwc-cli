# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅ Yes |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately by emailing **rkriad585@gmail.com**.

Do **not** open a public GitHub issue for security vulnerabilities.

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

You will receive a response within 48 hours. Once the issue is resolved, a security advisory will be published and you will be credited.

## Security Best Practices

- API keys for AI providers are stored in `~/.config/neostore/neorwc/config.json` — ensure this file has restricted permissions (`chmod 600` on Unix).
- Environment variables (`NEORWC_GOOGLE_KEY`, `OPENAI_API_KEY`, etc.) are the recommended way to provide API keys.
- The `--dry-run` flag can be used to preview generated documentation without writing any files.
- All network requests use TLS (HTTPS) — provider API endpoints use HTTPS exclusively.
