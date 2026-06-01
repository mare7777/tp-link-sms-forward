# Deployment

## Docker Compose

Local Docker deployment uses [docker-compose.yml](../docker-compose.yml).

Key points:

- `CONFIG__PASSWORD` is required.
- `CONFIG__API_USERS__APIUSER` is required.
- `CONFIG__SMS_LOG_FULL_CONTENT` defaults to `false`.
- Keep API bindings on localhost unless you intentionally place a reverse proxy in front of the service.

Build locally:

```bash
docker build -t tp-link-sms-forward:latest .
```

Run with Docker Compose:

```bash
docker compose up -d
```

## GHCR Private Image

Published image path:

```text
ghcr.io/mare7777/tp-link-sms-forward
```

For private pulls:

- GitHub username is required.
- Use a classic PAT with `read:packages`.

Login and pull:

```bash
docker login ghcr.io -u GITHUB_USERNAME
docker pull ghcr.io/mare7777/tp-link-sms-forward:latest
```

For publishing from GitHub Actions:

- Workflow needs `contents: read`
- Workflow needs `packages: write`

## Synology Container Manager

Synology deployment uses [docker-compose.yml](../docker-compose.yml) and [synology.env.example](../synology.env.example).

Recommended layout:

```text
/volume1/docker/tp-link-sms-forward/
  docker-compose.yml
  .env
```

Important notes:

- Keep the old containers if they are part of your rollback plan.
- `sms-cat` uses the named volume `sms_state:/app/state` to persist its cursor.
- Health checks use `http://127.0.0.1:3000/healthz` inside the container.
- Prefer uploading the compose file instead of editing YAML directly in DSM.

Basic flow:

1. Copy `synology.env.example` to `.env`
2. Fill in router, API, and optional Telegram settings
3. Ensure GHCR access is configured if you pull from a private package
4. Create a new project in Container Manager using `docker-compose.yml`
5. Verify all three services start: `api-bridge`, `sms-cat`, `smtp-gateway`

## Environment File Layout

Recommended split:

- `config.example.json`: documented example only
- `config.json`: local or manual non-container usage
- `.env`: Synology or Docker deployment secrets
- runtime volume: state cursor only

Do not commit `.env`, `config.json`, or exported state files.

## Health Check

Two endpoints matter:

- `GET /healthz`: container-local readiness or liveness
- `GET /api/v1/monitoring/health`: authenticated API health endpoint

Verify API bridge:

```bash
curl --user apiuser:YOUR_PASSWORD http://127.0.0.1:3000/api/v1/monitoring/health
```

## Backup and Logs

Back up:

- `.env`
- any local `config.json`
- the `sms_state` volume if you want to preserve polling cursor state

Operational guidance:

- keep Docker log rotation enabled
- keep `CONFIG__SMS_LOG_FULL_CONTENT=false` unless you need content-level debugging
- avoid exposing port `3000` directly to the public internet
