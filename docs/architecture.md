# Architecture

Audience: maintainers and contributors.

## Component Map

- `sms-send.mjs`: one-shot CLI sender
- `api-bridge.mjs`: REST API and router integration surface
- `sms-cat.mjs`: polling worker for unread inbox messages
- `smtp-gateway.mjs`: SMTP-to-SMS gateway

## Runtime Processes

Typical deployed runtime:

1. `api-bridge` exposes the router through an authenticated API
2. `sms-cat` polls unread inbox messages through `api-bridge`
3. `smtp-gateway` accepts SMTP mail and forwards messages through `api-bridge`

## Router Protocol Layer

Core internals:

- `src/routerClient.mjs`: session lifecycle
- `src/routerProtocol.mjs`: router-specific request building and parsing
- `src/routerEncryption.mjs`: TP-Link request encryption helpers
- `src/httpClient.mjs`: retried HTTP transport

## SMS Receiving Flow

1. Router receives an SMS on the SIM
2. `sms-cat.mjs` calls `GET /api/v1/sms/inbox?unread=true&unseenOnly=true`
3. When the router-specific unread feed is incomplete, the controller falls back to unread messages from the general inbox
4. `sms-cat.mjs` forwards the message to Telegram when enabled
5. In `at_least_once` mode, the message is marked read only after delivery succeeds

## SMS Sending Flow

1. Request enters through CLI, REST API, or SMTP gateway
2. Input is validated
3. Router client connects and authenticates
4. Router protocol submits the send request
5. Result is returned to the caller

## Reliability Model

- API requests use retry-aware HTTP transport
- `sms-cat` persists cursor state under `/app/state`
- `sms_delivery_mode=at_least_once` favors delivery before read acknowledgement
- polling jitter reduces synchronized polling bursts

## Router UI Alignment

The browser UI is used only for manual verification. Runtime behavior does not depend on scraping the DOM.

Mapping:

- `Advanced > SMS > Inbox` maps to `GET /api/v1/sms/inbox`
- `Unread` messages map to `GET /api/v1/sms/inbox?unread=true`
- successful delivery followed by mark-as-read maps to `PATCH /api/v1/sms/inbox/:order`

## Security Boundaries

- Router credentials are used only between the bridge and the router
- API consumers authenticate with Basic Auth users from `api_users`
- Telegram credentials are optional and should be treated as secrets
- production logs should keep `sms_log_full_content=false`
