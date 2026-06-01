# Operations

## Common Commands

Install dependencies:

```bash
npm install
```

Start services manually:

```bash
node api-bridge.mjs
node sms-cat.mjs
node smtp-gateway.mjs
```

Run checks:

```bash
npm run lint
npm run format:check
npm run audit
```

Validate setup:

```bash
node test-setup.mjs
```

## Polling and Latency

Main tuning knobs:

- `api_client_polling_delay`
- `api_client_polling_jitter_ms`

Use lower values for faster forwarding and higher values for lighter router or API load.

## Verification Flow

1. Verify router connectivity through `api-bridge`
2. Verify unread inbox retrieval through the API
3. Send or receive a real SMS on the router SIM
4. Confirm `sms-cat` processes it
5. Confirm Telegram forwarding if enabled

## Troubleshooting

### `api-bridge` unhealthy

Check:

- container health endpoint `/healthz`
- router credentials
- local network reachability to the router

### `sms-cat` is running but no Telegram messages arrive

Check:

- `telegram_enabled`
- bot token and chat ID
- unread inbox results from the API
- container logs for delivery errors

### No unread messages are picked up

Check:

- router UI really shows the message as unread
- `sms_state` is not carrying a stale cursor from another environment
- `GET /api/v1/sms/inbox?unread=true` returns the expected message

## Legacy Document Mapping

These older top-level files now forward to the focused docs set:

- `QUICK_REFERENCE.md` -> `docs/cheatsheet.md`
- `ARCHITECTURE.md` -> `docs/architecture.md`
- `UI_ALIGNMENT.md` -> `docs/architecture.md`
- `TESTING.md` -> `docs/operations.md`
- `SYNOLOGY_DS1522_CONTAINER_MANAGER_MANUAL.md` -> `docs/deployment.md`
