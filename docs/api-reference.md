# API Reference

Base URL:

```text
http://127.0.0.1:3000
```

Authentication:

- HTTP Basic Auth
- users are defined in `api_users`

## Monitoring

### `GET /api/v1/monitoring/health`

Returns the authenticated API health payload.

## Inbox

### `GET /api/v1/sms/inbox`

Returns inbox messages.

Common query parameters:

- `unread=true`
- `unseenOnly=true`

### `PATCH /api/v1/sms/inbox/:order`

Marks a message as read.

### `DELETE /api/v1/sms/inbox/:order`

Deletes a message from the inbox.

## Outbox

### `GET /api/v1/sms/outbox`

Returns outbox messages.

### `POST /api/v1/sms/outbox`

Sends an SMS.

Expected payload fields:

- `to`
- `content`

### `DELETE /api/v1/sms/outbox/:order`

Deletes an outbox message.

## Example Calls

List inbox:

```bash
curl --user apiuser:password \
  http://127.0.0.1:3000/api/v1/sms/inbox
```

List unread inbox:

```bash
curl --user apiuser:password \
  "http://127.0.0.1:3000/api/v1/sms/inbox?unread=true"
```

Send SMS:

```bash
curl --user apiuser:password \
  -H "Content-Type: application/json" \
  -d '{"to":"0912345678","content":"hello"}' \
  -X POST http://127.0.0.1:3000/api/v1/sms/outbox
```

Mark as read:

```bash
curl --user apiuser:password \
  -X PATCH http://127.0.0.1:3000/api/v1/sms/inbox/1
```
