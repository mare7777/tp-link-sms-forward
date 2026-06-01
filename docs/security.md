# Security

## Secrets Handling

- Do not commit `config.json`
- Do not commit `.env`
- Do not commit exported state or cursor files
- Keep Telegram bot credentials private

## Required Deployment Practices

- Use strong router and API passwords
- Keep API bindings on localhost unless a reverse proxy is intentionally configured
- Do not expose port `3000` directly to the public internet without additional controls
- Keep `CONFIG__SMS_LOG_FULL_CONTENT=false` in production by default

## Logging and Privacy

`sms-cat.mjs` supports a privacy toggle:

- `sms_log_full_content=false`: masked sender, receive time, and content length only
- `sms_log_full_content=true`: full SMS body is logged

Use full-content logging only for short-lived debugging sessions.

## GHCR Access

Recommended GitHub token scopes:

- pull private image: `read:packages`
- publish image: `write:packages`

Avoid reusing broad personal tokens when a narrower package token is enough.

## Runtime Risk Areas

- SMS content may contain OTPs, personal messages, or customer data
- centralized logging systems can unintentionally retain sensitive message content
- Synology or Docker backups may capture secrets if `.env` is stored loosely
