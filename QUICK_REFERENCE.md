# QUICK REFERENCE

## 常用命令清單

```bash
# 安裝
npm install

# 建立設定
cp config.example.json config.json

# 環境檢查
node test-setup.mjs

# CLI 發送 SMS
node sms-send.mjs "0912345678" "測試訊息"

# 啟動 API Bridge
node api-bridge.mjs

# 啟動 SMS 輪詢
node sms-cat.mjs

# 啟動 SMTP Gateway
node smtp-gateway.mjs

# 程式碼檢查
npm run lint
npm run format:check
```

## API 端點速查

**Base URL**: `http://127.0.0.1:3000`

**Auth**: Basic Auth（`--user <username>:<password>`）

### Inbox

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/v1/sms/inbox` | 取得收件匣 |
| GET | `/api/v1/sms/inbox?unread=true` | 只取未讀 |
| PATCH | `/api/v1/sms/inbox/:order` | 標記為已讀 |
| DELETE | `/api/v1/sms/inbox/:order` | 刪除收件訊息 |

### Outbox

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/v1/sms/outbox` | 取得寄件匣 |
| POST | `/api/v1/sms/outbox` | 發送 SMS |
| DELETE | `/api/v1/sms/outbox/:order` | 刪除寄件訊息 |

## 請求範例

```bash
# 取得收件匣
curl --user apiuser:password \
  http://127.0.0.1:3000/api/v1/sms/inbox

# 發送 SMS（JSON）
curl --user apiuser:password \
  -H "Content-Type: application/json" \
  -d '{"to":"0912345678","content":"測試"}' \
  -X POST http://127.0.0.1:3000/api/v1/sms/outbox

# 標記為已讀
curl --user apiuser:password \
  -X PATCH http://127.0.0.1:3000/api/v1/sms/inbox/1
```

## 管理端點範例

```bash
# 只取未讀
curl --user apiuser:password \
  "http://127.0.0.1:3000/api/v1/sms/inbox?unread=true"

# 刪除收件訊息
curl --user apiuser:password \
  -X DELETE http://127.0.0.1:3000/api/v1/sms/inbox/1

# 查寄件匣
curl --user apiuser:password \
  http://127.0.0.1:3000/api/v1/sms/outbox

# 刪除寄件訊息
curl --user apiuser:password \
  -X DELETE http://127.0.0.1:3000/api/v1/sms/outbox/1
```
