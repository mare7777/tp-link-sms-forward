# 測試指南

本文件說明如何測試和驗證此專案的功能。

## 前置準備

### 1. 安裝依賴套件

```bash
# 使用 yarn（推薦）
yarn install

# 或使用 npm
npm install
```

### 2. 建立設定檔

複製範例設定檔並修改：

```bash
cp config.example.json config.json
```

編輯 `config.json` 並填入您的路由器資訊：

```json
{
    "url": "http://192.168.1.1",
    "login": "admin",
    "password": "你的路由器密碼",
    "api_listen_host": "127.0.0.1",
    "api_listen_port": 3000,
    "api_users": { "apiuser": "你的API密碼" },
    "api_client_url": "http://localhost:3000",
    "api_client_login": "apiuser",
    "api_client_password": "你的API密碼",
    "api_client_polling_delay": 5000,
    "sms_gateway_url": "http://localhost:3000",
    "sms_gateway_login": "apiuser",
    "sms_gateway_password": "你的API密碼",
    "sms_gateway_domain": "smtp2sms.local",
    "sms_gateway_listen_host": "127.0.0.1",
    "sms_gateway_listen_port": 1025
}
```

**重要**:
- 將 `你的路由器密碼` 改為實際的 TP-Link 路由器管理密碼
- 將 `你的API密碼` 改為強密碼（用於 API 認證）
- 確保您的電腦與路由器在同一網路

### 3. 執行程式碼檢查

```bash
# 檢查程式碼風格
npm run lint

# 檢查安全性
npm audit
```

---

## 測試步驟

### 測試 1: 驗證設定檔格式

```bash
# 嘗試啟動 API Bridge，會自動驗證設定
node api-bridge.mjs
```

**預期結果**:
- 如果設定正確，應該看到：
  ```
  Configuration validated successfully
  Api bridge listening at http://127.0.0.1:3000
  ```
- 如果設定有誤，會看到具體的錯誤訊息

按 `Ctrl+C` 停止。

---

### 測試 2: 發送單則 SMS（命令列模式）

這是最簡單的測試方式，不需要啟動 API。

```bash
node sms-send.mjs "0912345678" "測試訊息"
```

**預期結果**:
```
args {
  routerUiUrl: 'http://192.168.1.1',
  routerUiLogin: 'admin',
  routerUiPassword: 'xxxxx',
  to: '0912345678',
  textContent: '測試訊息'
}
Great! SMS send operation was accepted.
Great! SMS sent successfully
```

**如果失敗**:
- `HTTP 403` → 密碼錯誤或不在同一網路
- `ECONNREFUSED` → 無法連接路由器，檢查 URL
- `timeout` → 路由器回應太慢，重試一次

---

### 測試 3: 啟動 API Bridge 並測試

#### 3.1 啟動 API Bridge

```bash
node api-bridge.mjs
```

保持此終端機視窗開啟。

#### 3.2 開啟另一個終端機測試 API

**測試 Swagger 文件** (瀏覽器):
```
http://127.0.0.1:3000
```

應該會看到 Swagger UI 介面。

**測試查詢收件匣**:
```bash
curl --user apiuser:你的API密碼 -X GET "http://127.0.0.1:3000/api/v1/sms/inbox" -H "accept: application/json"
```

**預期結果**:
```json
{
  "status": 200,
  "data": [
    {
      "index": 1,
      "from": "+886912345678",
      "content": "訊息內容",
      "receivedTime": "2025-01-15T10:30:00.000Z",
      "unread": false
    }
  ]
}
```

**測試發送 SMS**:
```bash
curl --user apiuser:你的API密碼 \
  -d "to=0912345678" \
  -d "content=API測試訊息" \
  -X POST "http://127.0.0.1:3000/api/v1/sms/outbox" \
  -H "accept: application/json"
```

**預期結果**:
```json
{
  "status": 200,
  "data": [...]
}
```

**測試輸入驗證**（應該回傳錯誤）:
```bash
# 測試無效電話號碼
curl --user apiuser:你的API密碼 \
  -d "to=abc" \
  -d "content=測試" \
  -X POST "http://127.0.0.1:3000/api/v1/sms/outbox"
```

**預期結果**:
```json
{
  "status": 400,
  "error": "Invalid phone number format"
}
```

**測試速率限制**:
```bash
# 快速發送 15 次請求（超過 10 次/分鐘的限制）
for i in {1..15}; do
  curl --user apiuser:你的API密碼 \
    -d "to=0912345678" \
    -d "content=測試$i" \
    -X POST "http://127.0.0.1:3000/api/v1/sms/outbox"
  echo ""
done
```

**預期結果**: 前 10 次成功，之後收到：
```json
{
  "status": 429,
  "error": "Too many SMS requests, please try again later"
}
```

---

### 測試 4: SMS 接收（輪詢模式）

#### 4.1 啟動 SMS Cat

開啟新終端機：

```bash
node sms-cat.mjs
```

**預期結果**: 會持續監聽新 SMS，有新訊息時會輸出：
```json
{"message":"Received SMS","level":"info","sms":{"from":"+886912345678","content":"訊息內容","receivedTime":"2025-01-15T10:30:00.000Z"}}
```

#### 4.2 測試接收

從手機發送 SMS 到路由器的 SIM 卡號碼，應該會在 sms-cat 終端機看到訊息。

---

### 測試 5: SMTP to SMS Gateway

#### 5.1 啟動 SMTP Gateway

開啟新終端機：

```bash
node smtp-gateway.mjs
```

#### 5.2 發送測試郵件

**方法 1: 使用 curl**
```bash
curl -v smtp://127.0.0.1:1025 \
  --mail-rcpt 0912345678@smtp2sms.local \
  --upload-file <(echo -e "\nSMTP測試訊息")
```

**方法 2: 使用 Python**
```python
import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg.set_content('SMTP 測試訊息')
msg['To'] = '0912345678@smtp2sms.local'

with smtplib.SMTP('127.0.0.1', 1025) as smtp:
    smtp.send_message(msg)
```

**預期結果**: SMS 應該發送到指定號碼。

---

## 常見問題排除

### 問題 1: `Cannot find module`

**原因**: 依賴套件未安裝

**解決方法**:
```bash
rm -rf node_modules yarn.lock
yarn install
```

### 問題 2: `Config file could not be read`

**原因**: 找不到 config.json

**解決方法**:
```bash
cp config.example.json config.json
# 編輯 config.json
```

### 問題 3: `Authentication failed` 或 `HTTP 403`

**可能原因**:
1. 路由器密碼錯誤
2. 不在同一網路
3. 路由器有其他人登入

**解決方法**:
1. 確認密碼正確
2. 確認電腦 IP 在路由器的網段（通常是 192.168.1.x）
3. 登出路由器的 Web UI

### 問題 4: `ECONNREFUSED` 或 `timeout`

**可能原因**:
1. 路由器 URL 錯誤
2. 路由器關機或無法連線
3. 防火牆阻擋

**解決方法**:
1. 確認路由器 IP（通常是 192.168.1.1）
2. 用瀏覽器測試是否能開啟路由器管理頁面
3. 暫時關閉防火牆測試

### 問題 5: SMS 無法發送

**檢查清單**:
- [ ] 路由器有插入 SIM 卡
- [ ] SIM 卡有訊號（檢查路由器狀態）
- [ ] SIM 卡有 SMS 額度
- [ ] 電話號碼格式正確
- [ ] 路由器 SMS 功能已啟用

---

## 完整測試檢查表

執行所有測試以確認功能正常：

- [ ] **環境檢查**
  - [ ] Node.js 已安裝 (`node --version`)
  - [ ] 依賴套件已安裝 (`yarn install`)
  - [ ] config.json 已建立且正確

- [ ] **程式碼品質**
  - [ ] ESLint 檢查通過 (`npm run lint`)
  - [ ] 沒有安全漏洞 (`npm audit`)

- [ ] **基本功能**
  - [ ] API Bridge 能正常啟動
  - [ ] Swagger UI 可以開啟
  - [ ] 設定檔驗證正常運作

- [ ] **SMS 發送**
  - [ ] 命令列模式發送成功
  - [ ] API 模式發送成功
  - [ ] 輸入驗證正常（拒絕無效號碼）

- [ ] **SMS 接收**
  - [ ] API 查詢收件匣成功
  - [ ] SMS Cat 能接收新訊息

- [ ] **安全功能**
  - [ ] 速率限制正常運作
  - [ ] 認證失敗時正確拒絕
  - [ ] 錯誤訊息不洩漏敏感資訊

- [ ] **SMTP Gateway**（可選）
  - [ ] SMTP 伺服器能啟動
  - [ ] 能透過 SMTP 發送 SMS

---

## 生產環境部署建議

### 1. 使用 PM2 管理行程

```bash
# 安裝 PM2
npm install -g pm2

# 啟動 API Bridge
pm2 start api-bridge.mjs --name "sms-api"

# 啟動 SMS Cat
pm2 start sms-cat.mjs --name "sms-cat"

# 查看狀態
pm2 status

# 查看日誌
pm2 logs

# 開機自動啟動
pm2 startup
pm2 save
```

### 2. 使用 Nginx 反向代理（啟用 HTTPS）

```nginx
server {
    listen 443 ssl http2;
    server_name sms.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 設定檔案權限

```bash
# 保護設定檔
chmod 600 config.json

# 確保只有擁有者可以讀寫
chown $USER:$USER config.json
```

### 4. 啟用日誌輪替

建立 `/etc/logrotate.d/tp-link-sms`:
```
/path/to/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 youruser yourgroup
}
```

---

## Docker 部署（可選）

### 建置映像

```bash
docker build -t tp-link-sms .
```

### 執行容器

```bash
docker run -d \
  --name sms-api \
  -p 3000:3000 \
  -v $(pwd)/config.json:/app/config.json:ro \
  --restart unless-stopped \
  tp-link-sms
```

### 查看日誌

```bash
docker logs -f sms-api
```

---

## 監控與維護

### 定期檢查

```bash
# 檢查服務狀態
pm2 status

# 檢查日誌中的錯誤
pm2 logs --err

# 檢查系統資源使用
pm2 monit
```

### 更新依賴

```bash
# 檢查過期套件
npm outdated

# 更新套件
npm update

# 執行安全審查
npm audit
npm audit fix
```

---

## 需要協助？

如果遇到問題：

1. 檢查日誌檔案
2. 確認網路連線
3. 驗證設定檔格式
4. 查看路由器狀態
5. 參考 [Common errors](README.md#common-errors) 章節

---

**測試完成後**，如果所有功能正常，您就可以開始正式使用此專案了！