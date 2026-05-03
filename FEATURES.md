# 功能索引（Feature Index）

> 本文件為 1~2 頁索引版；詳細說明請以 `README.md` 與 `ARCHITECTURE.md` 為準。

## 1. 核心能力索引

| 功能 | 入口檔案 | 對外介面 | 主要用途 |
|---|---|---|---|
| CLI 發送 SMS | `sms-send.mjs` | CLI | Shell/Cron 通知、手動發送 |
| REST API（收發/管理） | `api-bridge.mjs` | HTTP + Swagger | 應用程式整合 |
| SMS 輪詢接收 | `sms-cat.mjs` | JSON log stream | 事件轉送、告警工作流 |
| SMTP 轉 SMS | `smtp-gateway.mjs` | SMTP | 舊系統 Email 告警銜接 |

## 2. API 功能索引

### Inbox
- `GET /api/v1/sms/inbox`
- `GET /api/v1/sms/inbox?unread=true`
- `PATCH /api/v1/sms/inbox/:order`
- `DELETE /api/v1/sms/inbox/:order`

### Outbox
- `GET /api/v1/sms/outbox`
- `POST /api/v1/sms/outbox`
- `DELETE /api/v1/sms/outbox/:order`

## 3. 運維與調校索引

- 輪詢參數：`api_client_polling_delay`、`api_client_polling_jitter_ms`
- API 安全：Basic Auth（`api_users`）
- 常用檢查：`node test-setup.mjs`、`npm run lint`

## 4. 快速導覽

- 快速開始與功能矩陣：[`README.md`](./README.md)
- 系統架構與模組：[`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 命令與端點速查：[`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)
