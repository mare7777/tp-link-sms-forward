# Cheatsheet

## Setup

```bash
npm install
cp config.example.json config.json
node test-setup.mjs
```

## Manual Commands

```bash
node sms-send.mjs "0912345678" "test message"
node api-bridge.mjs
node sms-cat.mjs
node smtp-gateway.mjs
```

## API

```bash
curl --user apiuser:password \
  http://127.0.0.1:3000/api/v1/sms/inbox

curl --user apiuser:password \
  "http://127.0.0.1:3000/api/v1/sms/inbox?unread=true"

curl --user apiuser:password \
  -H "Content-Type: application/json" \
  -d '{"to":"0912345678","content":"hello"}' \
  -X POST http://127.0.0.1:3000/api/v1/sms/outbox
```

## Docker

```bash
docker build -t tp-link-sms-forward:latest .
docker compose up -d
```

## Synology

```bash
cp synology.env.example .env
```

Then upload `docker-compose.synology.yml` into Container Manager and create a new project.

## Telegram

```dotenv
CONFIG__TELEGRAM_ENABLED=true
CONFIG__TELEGRAM_BOT_TOKEN=replace-with-bot-token
CONFIG__TELEGRAM_CHAT_ID=replace-with-chat-id
CONFIG__SMS_LOG_FULL_CONTENT=false
```
