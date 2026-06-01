# TP-Link SMS Forward

Programmatic SMS bridge for TP-Link Archer LTE routers.

## Features

| Feature | Entry point | Use case |
| --- | --- | --- |
| Send SMS from CLI | `sms-send.mjs` | scripts, alerts, manual testing |
| REST API bridge | `api-bridge.mjs` | application integration |
| Poll unread SMS | `sms-cat.mjs` | Telegram forwarding, automation |
| SMTP to SMS | `smtp-gateway.mjs` | legacy email-driven systems |

## Quick Start

```bash
npm install
cp config.example.json config.json
node api-bridge.mjs
```

In another terminal:

```bash
node sms-cat.mjs
```

Default API URL: `http://127.0.0.1:3000`

## Required Configuration

Minimum required settings:

- `url`
- `login`
- `password`
- `api_users`

Full reference: [docs/configuration.md](./docs/configuration.md)

## Docker and Synology

Docker, GHCR, and Synology deployment are documented in:

- [docs/deployment.md](./docs/deployment.md)

## API

Common endpoints:

- `GET /api/v1/sms/inbox`
- `POST /api/v1/sms/outbox`
- `PATCH /api/v1/sms/inbox/:order`
- `GET /api/v1/monitoring/health`

Full reference: [docs/api-reference.md](./docs/api-reference.md)

## Security Notes

- Do not commit `config.json`, `.env`, or runtime state files.
- Keep `CONFIG__SMS_LOG_FULL_CONTENT=false` in production unless you explicitly need full SMS bodies in logs.
- Use strong API Basic Auth passwords.
- Keep Telegram bot credentials private.

## Documentation

- [docs/configuration.md](./docs/configuration.md)
- [docs/deployment.md](./docs/deployment.md)
- [docs/api-reference.md](./docs/api-reference.md)
- [docs/cheatsheet.md](./docs/cheatsheet.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/operations.md](./docs/operations.md)
- [docs/security.md](./docs/security.md)
