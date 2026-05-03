# 快速參考卡

## 🚀 一鍵測試命令

```bash
# 1. 檢查環境
node test-setup.mjs

# 2. 測試發送 SMS
node sms-send.mjs "0912345678" "測試"

# 3. 啟動 API
node api-bridge.mjs
```

## 📝 常用指令

### 發送 SMS

```bash
# 基本用法
node sms-send.mjs "電話號碼" "訊息內容"

# 使用自訂設定檔
node sms-send.mjs --config=myconfig.json "0912345678" "測試"

# 指定路由器資訊
node sms-send.mjs --url="http://192.168.1.1" --login="admin" --password="密碼" "0912345678" "測試"
```

### API 操作

```bash
# 啟動 API Bridge
node api-bridge.mjs

# 使用自訂設定
node api-bridge.mjs --config=myconfig.json

# 啟動 SMS 接收器
node sms-cat.mjs

# 啟動 SMTP Gateway
node smtp-gateway.mjs
```

### 程式碼檢查

```bash
# 執行 Lint
npm run lint

# 自動修正
npm run lint:fix

# 格式化程式碼
npm run format

# 檢查格式
npm run format:check

# 安全審查
npm audit
```

## 🔧 API 端點

**Base URL**: `http://127.0.0.1:3000`

### 認證
所有 API 需要 Basic Auth:
```bash
--user apiuser:your_password
```

### 端點列表

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/v1/sms/inbox` | 取得收件匣 (最多 8 則) |
| GET | `/api/v1/sms/inbox?unread=true` | 只取得未讀訊息 |
| PATCH | `/api/v1/sms/inbox/:order` | 標記為已讀 |
| DELETE | `/api/v1/sms/inbox/:order` | 刪除訊息 |
| GET | `/api/v1/sms/outbox` | 取得寄件匣 |
| POST | `/api/v1/sms/outbox` | 發送 SMS |
| DELETE | `/api/v1/sms/outbox/:order` | 刪除已發送訊息 |

### 範例請求

**取得收件匣**:
```bash
curl --user apiuser:password \
  http://127.0.0.1:3000/api/v1/sms/inbox
```

**發送 SMS**:
```bash
curl --user apiuser:password \
  -d "to=0912345678" \
  -d "content=測試訊息" \
  -X POST http://127.0.0.1:3000/api/v1/sms/outbox
```

**JSON 格式發送**:
```bash
curl --user apiuser:password \
  -H "Content-Type: application/json" \
  -d '{"to":"0912345678","content":"測試"}' \
  -X POST http://127.0.0.1:3000/api/v1/sms/outbox
```

## 📋 設定檔格式

### config.json 完整範例

```json
{
  "url": "http://192.168.1.1",
  "login": "admin",
  "password": "路由器密碼",
  "api_listen_host": "127.0.0.1",
  "api_listen_port": 3000,
  "api_users": {
    "apiuser": "API密碼"
  },
  "api_client_url": "http://localhost:3000",
  "api_client_login": "apiuser",
  "api_client_password": "API密碼",
  "api_client_polling_delay": 5000,
  "sms_gateway_url": "http://localhost:3000",
  "sms_gateway_login": "apiuser",
  "sms_gateway_password": "API密碼",
  "sms_gateway_domain": "smtp2sms.local",
  "sms_gateway_listen_host": "127.0.0.1",
  "sms_gateway_listen_port": 1025
}
```

### 最小設定（只發送 SMS）

```json
{
  "url": "http://192.168.1.1",
  "login": "admin",
  "password": "路由器密碼"
}
```

### API Bridge 設定

```json
{
  "url": "http://192.168.1.1",
  "login": "admin",
  "password": "路由器密碼",
  "api_listen_host": "127.0.0.1",
  "api_listen_port": 3000,
  "api_users": {
    "user1": "password1",
    "user2": "password2"
  }
}
```

## ⚠️ 常見錯誤

### HTTP 403
**問題**: 認證失敗
**解決**:
- 檢查路由器密碼
- 確認在同一網路
- 確認沒有其他人登入路由器 Web UI

### ECONNREFUSED
**問題**: 無法連接路由器
**解決**:
- 檢查路由器 URL (通常是 192.168.1.1)
- 確認路由器已開機
- 用瀏覽器測試路由器 Web UI

### Config file could not be read
**問題**: 找不到設定檔
**解決**:
```bash
cp config.example.json config.json
# 編輯 config.json
```

### Invalid phone number format
**問題**: 電話號碼格式錯誤
**解決**:
- 使用 8-15 位數字
- 可加 + 號 (如 +886912345678)
- 不要包含空格或特殊字元

### Too many requests
**問題**: 超過速率限制
**解決**:
- 等待 1 分鐘後重試
- SMS: 最多 10 次/分鐘
- API: 最多 60 次/分鐘

## 🔐 安全檢查清單

- [ ] 已將預設密碼改為強密碼
- [ ] config.json 權限設為 600 (chmod 600 config.json)
- [ ] API 只監聽 127.0.0.1，未暴露於公網
- [ ] 已定期執行 npm audit
- [ ] 已啟用 HTTPS (如果遠端存取)
- [ ] 已備份 config.json

## 📊 速率限制

| 端點 | 限制 |
|------|------|
| SMS 發送 (`/api/v1/sms/outbox`) | 10 次/分鐘 |
| 其他 API | 60 次/分鐘 |

## 🐛 除錯技巧

### 檢視詳細日誌
API Bridge 會輸出所有請求日誌到 console。

### 測試路由器連線
```bash
curl http://192.168.1.1
```

### 驗證 API 是否運作
```bash
curl http://127.0.0.1:3000
```

### 檢查 JSON 格式
```bash
cat config.json | jq .
```

## 📦 目錄結構

```
tp-link-sms_forward/
├── api-bridge.mjs          # API 伺服器
├── sms-send.mjs           # 發送 SMS 腳本
├── sms-cat.mjs            # 接收 SMS 腳本
├── smtp-gateway.mjs       # SMTP Gateway
├── test-setup.mjs         # 環境檢查腳本
├── config.json            # 你的設定檔 (需自建)
├── config.example.json    # 設定檔範例
├── README.md              # 主要說明文件
├── TESTING.md             # 詳細測試指南
├── QUICK_REFERENCE.md     # 本檔案
└── src/
    ├── routerClient.mjs   # 路由器客戶端
    ├── validation.mjs     # 輸入驗證
    ├── constants.mjs      # 常數定義
    ├── axiosConfig.mjs    # HTTP 設定
    └── controllers/
        └── sms.mjs        # SMS API 控制器
```

## 🔗 相關連結

- [完整說明文件](README.md)
- [詳細測試指南](TESTING.md)
- [GitHub Issues](https://github.com/plewin/tp-link-modem-router/issues)

## 💡 小技巧

### 使用環境變數
```bash
export ROUTER_URL="http://192.168.1.1"
export ROUTER_LOGIN="admin"
export ROUTER_PASSWORD="密碼"
```

### 使用 PM2 管理
```bash
pm2 start api-bridge.mjs --name sms-api
pm2 logs sms-api
pm2 restart sms-api
```

### 快速重啟
```bash
# 停止所有
pm2 stop all

# 重新載入設定並啟動
pm2 reload all
```

---

**需要協助?** 查看 [TESTING.md](TESTING.md) 取得詳細說明
