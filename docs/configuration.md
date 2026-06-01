# Configuration

## Configuration Sources

Configuration is loaded in this order:

1. `config.json`
2. `CONFIG_JSON`
3. `CONFIG__...` environment variables

Environment values override file values.

## Required Settings

These values are required for any real deployment:

- `url`
- `login`
- `password`
- `api_users`

For Synology and Docker deployments, required secrets should be provided through `.env` or container environment variables instead of committed files.

## Router Settings

| Key | Purpose |
| --- | --- |
| `url` | Router UI base URL, usually `http://192.168.1.1` |
| `login` | Router UI login name |
| `password` | Router UI password |

## API Bridge Settings

| Key | Purpose |
| --- | --- |
| `api_listen_host` | Bind host for the REST API |
| `api_listen_port` | Bind port for the REST API |
| `api_users` | Basic Auth users for the API |

## SMS Polling Settings

| Key | Purpose |
| --- | --- |
| `api_client_url` | URL used by `sms-cat.mjs` to call `api-bridge` |
| `api_client_login` | API Basic Auth user for polling |
| `api_client_password` | API Basic Auth password for polling |
| `api_client_polling_delay` | Base polling delay in milliseconds |
| `api_client_polling_jitter_ms` | Random jitter added to reduce bursty polling |
| `sms_delivery_mode` | `at_least_once` or `at_most_once` |

## SMTP Gateway Settings

| Key | Purpose |
| --- | --- |
| `sms_gateway_url` | API URL used by `smtp-gateway.mjs` |
| `sms_gateway_login` | API Basic Auth user for SMTP forwarding |
| `sms_gateway_password` | API Basic Auth password for SMTP forwarding |
| `sms_gateway_domain` | Domain suffix used for SMTP recipients |
| `sms_gateway_listen_host` | SMTP bind host |
| `sms_gateway_listen_port` | SMTP bind port |

## Telegram Settings

| Key | Purpose |
| --- | --- |
| `telegram_enabled` | Enable Telegram forwarding |
| `telegram_bot_token` | Telegram bot token |
| `telegram_chat_id` | Target chat ID |
| `telegram_max_retries` | Retry count for Telegram delivery |
| `telegram_retry_initial_backoff_ms` | Initial retry backoff |
| `telegram_retry_max_backoff_ms` | Maximum retry backoff |
| `telegram_timeout_ms` | Telegram API timeout |

## Logging and Privacy

| Key | Purpose |
| --- | --- |
| `sms_log_full_content` | When `true`, `sms-cat.mjs` logs full SMS bodies. Default should stay `false` in production. |

When `sms_log_full_content=false`, the poller logs only masked sender information, receive time, and content length.

## Example `config.json`

```json
{
  "url": "http://192.168.1.1",
  "login": "admin",
  "password": "REPLACE_WITH_ROUTER_PASSWORD",
  "api_listen_host": "127.0.0.1",
  "api_listen_port": 3000,
  "api_users": {
    "apiuser": "REPLACE_WITH_API_PASSWORD"
  },
  "api_client_url": "http://localhost:3000",
  "api_client_login": "apiuser",
  "api_client_password": "REPLACE_WITH_API_PASSWORD",
  "api_client_polling_delay": 3000,
  "api_client_polling_jitter_ms": 500,
  "sms_gateway_url": "http://localhost:3000",
  "sms_gateway_login": "apiuser",
  "sms_gateway_password": "REPLACE_WITH_API_PASSWORD",
  "sms_gateway_domain": "smtp2sms.local",
  "sms_gateway_listen_host": "127.0.0.1",
  "sms_gateway_listen_port": 1025,
  "telegram_enabled": false,
  "telegram_bot_token": "REPLACE_WITH_TELEGRAM_BOT_TOKEN",
  "telegram_chat_id": "REPLACE_WITH_TELEGRAM_CHAT_ID",
  "sms_log_full_content": false,
  "sms_delivery_mode": "at_least_once"
}
```

## Example `.env`

```dotenv
IMAGE_NAME=ghcr.io/mare7777/tp-link-sms-forward:latest
CONFIG__URL=http://192.168.1.1
CONFIG__LOGIN=admin
CONFIG__PASSWORD=replace-with-router-password
CONFIG__API_USERS__APIUSER=replace-with-api-password
CONFIG__TELEGRAM_ENABLED=false
CONFIG__TELEGRAM_BOT_TOKEN=
CONFIG__TELEGRAM_CHAT_ID=
CONFIG__SMS_LOG_FULL_CONTENT=false
```
