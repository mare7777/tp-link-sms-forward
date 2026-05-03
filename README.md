# TP-Link SMS Forward 單一入口指南

本文件是專案的主入口，聚焦 **快速上線**、**功能矩陣** 與 **操作速查**。

## 文件地圖（只看這 3 份）

- [`README.md`](./README.md)：快速上線、功能矩陣、常見整合模式
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)：系統架構與模組設計
- [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)：命令與 API 端點速查

---

## 專案目的

這個專案讓你把 TP-Link Archer LTE 路由器的 SMS 功能程式化，提供三種核心能力：

1. 直接送 SMS（`sms-send.mjs`）
2. 暴露本機 REST API（`api-bridge.mjs`）
3. 持續拉取收件匣新簡訊（`sms-cat.mjs`）作為轉送入口

加值能力：SMTP 轉 SMS（`smtp-gateway.mjs`）。

---

## 3 分鐘快速啟動

### 1) 安裝

```bash
npm install
```

### 2) 建立設定檔

```bash
cp config.example.json config.json
```

至少先填妥：

- `url`：路由器位址（通常 `http://192.168.1.1`）
- `login` / `password`：路由器管理帳密
- `api_users`：API Basic Auth 帳密（務必改掉預設值）

### 3) 啟動 API Bridge

```bash
node api-bridge.mjs
```

預設服務位址：`http://127.0.0.1:3000`

### 4) 啟動 SMS 輪詢

```bash
node sms-cat.mjs
```

---

## 功能矩陣

| 能力 | 入口檔案 | 介面 | 典型用途 |
|---|---|---|---|
| SMS 發送（CLI） | `sms-send.mjs` | CLI | 腳本通知、一次性發送 |
| SMS 發送/查詢（REST） | `api-bridge.mjs` | HTTP API + Swagger | Web/後端系統整合 |
| SMS 即時接收 | `sms-cat.mjs` | Polling + JSON log | 告警轉送、事件觸發 |
| SMTP 轉 SMS | `smtp-gateway.mjs` | SMTP | 舊系統以 Email 送簡訊 |

### API 端點摘要

- `GET /api/v1/sms/inbox`：查收件匣（可加 `?unread=true`）
- `PATCH /api/v1/sms/inbox/:order`：標記已讀
- `DELETE /api/v1/sms/inbox/:order`：刪除收件訊息
- `GET /api/v1/sms/outbox`：查寄件匣
- `POST /api/v1/sms/outbox`：發送 SMS
- `DELETE /api/v1/sms/outbox/:order`：刪除寄件訊息

---

## Telegram 轉送整合範例（以 `sms-cat.mjs` 為核心）

```bash
node sms-cat.mjs --config=./config.json | \
  jq -rc 'select(.message=="Received SMS") | .sms' | \
  while read -r sms; do
    from=$(echo "$sms" | jq -r '.from')
    content=$(echo "$sms" | jq -r '.content')
    text="[Router SMS]\nFrom: ${from}\n${content}"

    curl -sS -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TG_CHAT_ID}" \
      --data-urlencode text="$text" >/dev/null
  done
```

---

## 即時性調校（`api_client_polling_delay` 建議值）

`sms-cat.mjs` 採輪詢模型，主要參數：

- `api_client_polling_delay`：基礎輪詢間隔（毫秒）
- `api_client_polling_jitter_ms`：每輪額外 jitter（0~N 毫秒）

建議值（先從「平衡」開始，再依需求微調）：

- 高即時（延遲優先）：`api_client_polling_delay=1500`、`api_client_polling_jitter_ms=300`
- 平衡（推薦）：`api_client_polling_delay=3000`、`api_client_polling_jitter_ms=500`
- 低負載（省資源）：`api_client_polling_delay=5000`、`api_client_polling_jitter_ms=1000`

估算端到端新增訊息偵測時間可用：

`偵測時間 ≈ polling_delay + (jitter_ms / 2) + router 回應時間`

---

## 常見使用情境

1. **系統告警通知**：監控腳本直接呼叫 `sms-send.mjs`。
2. **應用整合**：以 `api-bridge.mjs` 提供 HTTP 介面給 Web/後端。
3. **自動轉送**：`sms-cat.mjs` 接收後轉 Telegram/Slack/Webhook。

---

## 設定欄位速覽

| 設定欄位 | 用途 |
|---|---|
| `url` / `login` / `password` | 路由器登入資訊 |
| `api_listen_host` / `api_listen_port` | API Bridge 監聽位址與埠 |
| `api_users` | API Basic Auth 使用者清單 |
| `api_client_url` / `api_client_login` / `api_client_password` | `sms-cat.mjs` 連線 API 設定 |
| `api_client_polling_delay` / `api_client_polling_jitter_ms` | SMS 輪詢週期與抖動 |

## 內建 Telegram 轉送（`sms-cat.mjs`）

`sms-cat.mjs` 現在可直接呼叫 Telegram Bot API：
`https://api.telegram.org/bot<TOKEN>/sendMessage`。

### 設定欄位

- `telegram_enabled`：是否啟用 Telegram 轉送（`true/false`）
- `telegram_bot_token`：Bot Token
- `telegram_chat_id`：目標 chat id
- `sms_delivery_mode`：`at_least_once`（預設）或 `at_most_once`
  - `at_least_once`：Telegram 送成功才標記已讀；失敗則保留未讀，避免遺失
  - `at_most_once`：無論 Telegram 成敗都可標記已讀
- `telegram_max_retries` / `telegram_retry_initial_backoff_ms` / `telegram_retry_max_backoff_ms`：指數退避重試參數
- `telegram_timeout_ms`：單次 Telegram API 超時

### 啟動

```bash
node sms-cat.mjs --config=./config.json
```

Log 會包含 `order` 與部分遮罩的 `from` 以利追蹤，不會過度曝光敏感內容。
