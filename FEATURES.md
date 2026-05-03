# TP-Link SMS Forward - 完整功能說明

## 📋 目錄
- [專案概述](#專案概述)
- [核心功能](#核心功能)
- [架構組件](#架構組件)
- [安全功能](#安全功能)
- [技術特性](#技術特性)
- [使用場景](#使用場景)

---

## 專案概述

**TP-Link SMS Forward** 是一個針對 TP-Link Archer LTE 系列路由器的 SMS 管理工具套件，提供完整的 SMS 發送、接收和管理功能。透過反向工程路由器的 Web UI 通訊協定，實現了程式化的 SMS 操作。

### 支援的路由器型號
- TP-Link Archer MR200 v5
- TP-Link Archer MR600
- TP-Link TL-MR6400 v5

---

## 核心功能

### 1. 📤 SMS 發送功能

#### 1.1 命令列發送 ([sms-send.mjs](sms-send.mjs))

**功能描述**:
- 簡單易用的命令列工具
- 可直接從終端機發送 SMS
- 支援多種參數傳遞方式

**使用方式**:
```bash
# 基本用法
node sms-send.mjs "0912345678" "訊息內容"

# 使用命令列參數
node sms-send.mjs --url="http://192.168.1.1" --login="admin" --password="密碼" "0912345678" "測試"

# 使用設定檔
node sms-send.mjs --config="config.json" "0912345678" "測試"
```

**主要特點**:
- ✅ 自動連接路由器
- ✅ 加密通訊
- ✅ 驗證發送結果
- ✅ 錯誤處理和重試機制
- ✅ 返回狀態碼（0=成功，1=失敗）

**適用場景**:
- Shell 腳本自動化
- Cron 定時任務
- 系統通知
- 簡單的一次性發送

---

#### 1.2 REST API 發送 ([api-bridge.mjs](api-bridge.mjs))

**功能描述**:
- 提供 HTTP REST API 介面
- 支援多使用者認證
- 完整的 Swagger 文件

**API 端點**:
```http
POST /api/v1/sms/outbox
Content-Type: application/json
Authorization: Basic <base64(username:password)>

{
  "to": "0912345678",
  "content": "訊息內容"
}
```

**主要特點**:
- ✅ RESTful 設計
- ✅ Basic Authentication
- ✅ JSON 和 form-data 格式支援
- ✅ 速率限制保護（10 次/分鐘）
- ✅ 輸入驗證（電話號碼格式、內容長度）
- ✅ 錯誤訊息清理（不洩漏敏感資訊）
- ✅ 互動式 Swagger UI 介面

**適用場景**:
- Web 應用整合
- 微服務架構
- 第三方系統串接
- 多使用者環境

---

#### 1.3 SMTP to SMS Gateway ([smtp-gateway.mjs](smtp-gateway.mjs))

**功能描述**:
- 將 SMTP 郵件轉換為 SMS
- 支援標準 SMTP 協定
- Email 地址映射為電話號碼

**使用方式**:
```bash
# 啟動 SMTP Gateway
node smtp-gateway.mjs

# 發送郵件到電話號碼
# 格式: 電話號碼@設定的網域
echo "訊息內容" | mail -s "Subject" 0912345678@smtp2sms.local
```

**主要特點**:
- ✅ 標準 SMTP 伺服器
- ✅ 自動解析郵件內容
- ✅ 電話號碼格式驗證
- ✅ 錯誤處理和重試
- ✅ 支援多種 SMTP 客戶端

**適用場景**:
- 郵件系統整合
- 監控系統告警
- 傳統應用現代化
- Email to SMS 轉換

---

### 2. 📥 SMS 接收功能

#### 2.1 REST API 查詢 ([api-bridge.mjs](api-bridge.mjs))

**功能描述**:
- 查詢路由器的 SMS 收件匣
- 支援篩選條件（未讀/已讀）
- 提供訊息管理功能

**API 端點**:

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/v1/sms/inbox` | 取得所有 SMS（最多 8 則） |
| GET | `/api/v1/sms/inbox?unread=true` | 只取得未讀 SMS |
| PATCH | `/api/v1/sms/inbox/:order` | 標記 SMS 為已讀 |
| DELETE | `/api/v1/sms/inbox/:order` | 刪除 SMS |
| GET | `/api/v1/sms/outbox` | 取得已發送 SMS |
| DELETE | `/api/v1/sms/outbox/:order` | 刪除已發送 SMS |

**回應格式**:
```json
{
  "status": 200,
  "data": [
    {
      "index": 1,
      "from": "+886912345678",
      "content": "訊息內容",
      "receivedTime": "2025-01-15T10:30:00.000Z",
      "unread": true
    }
  ]
}
```

**主要特點**:
- ✅ 即時查詢
- ✅ 狀態管理（已讀/未讀）
- ✅ 時間戳記
- ✅ 完整的訊息資訊

**適用場景**:
- 訊息中心
- 雙向溝通系統
- 客服平台
- 自動回覆系統

---

#### 2.2 SMS Cat - 即時監聽 ([sms-cat.mjs](sms-cat.mjs))

**功能描述**:
- 持續輪詢新 SMS
- 即時輸出新訊息
- 自動標記為已讀

**使用方式**:
```bash
# 基本用法
node sms-cat.mjs

# 處理新訊息
node sms-cat.mjs | while read line; do
  echo "$line" | jq -r '.sms.content'
  # 處理訊息內容
done

# 篩選特定發送者
node sms-cat.mjs | jq -c 'select(.sms.from=="+886912345678")'
```

**主要特點**:
- ✅ 持續監聽
- ✅ 自動重連
- ✅ JSON 格式輸出
- ✅ 可設定輪詢間隔
- ✅ 錯誤自動恢復

**適用場景**:
- 即時通知系統
- 訊息轉發
- 自動化工作流
- 事件觸發系統

---

## 架構組件

### 3. 🏗️ 核心模組

#### 3.1 路由器客戶端 ([src/routerClient.mjs](src/routerClient.mjs))

**功能**:
- 處理與路由器的所有通訊
- 管理認證和會話
- 執行加密/解密操作

**主要方法**:
```javascript
// 連接路由器
await client.connect()

// 執行命令
await client.execute(payload)

// 斷開連接
await client.disconnect()
```

**特點**:
- ✅ 自動認證
- ✅ 會話管理
- ✅ 自動重連（當會話過期時）
- ✅ 每個實例獨立加密狀態

---

#### 3.2 路由器協定 ([src/routerProtocol.mjs](src/routerProtocol.mjs))

**功能**:
- 實現路由器的通訊協定
- 資料框架編碼/解碼
- 類型轉換和格式化

**支援的操作**:
```javascript
// 操作類型
ACT_GET  // 查詢
ACT_SET  // 設定
ACT_DEL  // 刪除
ACT_GL   // 取得列表
ACT_CGI  // 執行 CGI
```

**控制器**:
```javascript
LTE_SMS_RECVMSGBOX      // 收件匣
LTE_SMS_SENDMSGBOX      // 寄件匣
LTE_SMS_SENDNEWMSG      // 發送新訊息
LTE_SMS_RECVMSGENTRY    // 收件匣條目
LTE_SMS_UNREADMSGENTRY  // 未讀訊息
```

---

#### 3.3 加密模組 ([src/routerEncryption.mjs](src/routerEncryption.mjs))

**功能**:
- RSA 512 位元加密（認證）
- AES-128-CBC 加密（命令）
- 簽章產生和驗證

**加密流程**:
1. 取得路由器公鑰
2. 產生 AES 金鑰
3. 使用 RSA 加密 AES 金鑰
4. 使用 AES 加密命令

**特點**:
- ✅ 每個客戶端獨立加密實例
- ✅ 自動金鑰產生
- ✅ 完整的加密/解密支援

---

#### 3.4 驗證模組 ([src/validation.mjs](src/validation.mjs))

**功能**:
- 輸入資料驗證
- 錯誤訊息清理
- 設定檔驗證

**驗證項目**:
```javascript
// 電話號碼驗證
isValidPhoneNumber(phone)  // 8-15 位數字，可選 +

// SMS 內容驗證
validateSmsContent(content)  // 非空，最多 1600 字元

// 設定檔驗證
validateConfig(config)  // URL、認證資訊等

// 錯誤清理
sanitizeError(error)  // 移除敏感資訊
```

---

## 安全功能

### 4. 🔒 安全機制

#### 4.1 認證與授權

**Basic Authentication**:
- 所有 API 端點都需要認證
- 支援多使用者
- Base64 編碼傳輸

**會話管理**:
- 自動取得 Session ID 和 Token
- 會話過期自動重連
- 防止並行會話衝突

---

#### 4.2 速率限制 ([api-bridge.mjs](api-bridge.mjs))

**SMS 發送限制**:
- 10 次/分鐘（每個 IP）
- 防止 SMS 濫用
- 節省 SMS 費用

**一般 API 限制**:
- 60 次/分鐘（每個 IP）
- 防止 DoS 攻擊
- 保護路由器資源

**回應格式**:
```json
{
  "status": 429,
  "error": "Too many requests, please try again later"
}
```

---

#### 4.3 輸入驗證與清理

**電話號碼驗證**:
- Regex 格式檢查
- 長度限制（8-15 位）
- 特殊字元過濾

**SMS 內容驗證**:
- 非空檢查
- 長度限制（1600 字元）
- 自動去除首尾空白

**錯誤訊息清理**:
- 不洩漏堆疊追蹤
- 不顯示內部錯誤細節
- 提供友善的錯誤提示

---

#### 4.4 設定檔保護

**檔案權限建議**:
```bash
chmod 600 config.json  # 只有擁有者可讀寫
```

**敏感資訊保護**:
- 密碼不記錄到日誌
- Session ID/Token 不輸出
- AES 金鑰不顯示（除了 debug 模式）

---

## 技術特性

### 5. 🛠️ 技術實作

#### 5.1 錯誤處理

**全域錯誤處理**:
- Express 錯誤中介層
- 404 路由處理
- 優雅的錯誤回應

**自動重試機制**:
- HTTP 請求自動重試（最多 3 次）
- 指數退避延遲
- 可設定的重試條件

**會話恢復**:
- 檢測到 500 錯誤時自動重連
- 重新認證並重試請求
- 透明的錯誤處理

---

#### 5.2 日誌系統 ([src/logger.mjs](src/logger.mjs))

**日誌等級**:
- `error`: 錯誤訊息
- `warn`: 警告訊息
- `info`: 一般資訊
- `debug`: 除錯資訊

**日誌輸出**:
```javascript
logger.info('API bridge listening', { host, port });
logger.error('Connection failed', { error: err.message });
logger.debug('Encryption configured');
```

**安全性**:
- 敏感資訊使用 debug 等級
- 生產環境建議關閉 debug
- 不記錄密碼和金鑰

---

#### 5.3 程式碼品質

**ESLint 設定** ([.eslintrc.json](.eslintrc.json)):
- 標準 JavaScript 規則
- ES2021+ 語法支援
- 模組化程式碼檢查

**Prettier 設定** ([.prettierrc.json](.prettierrc.json)):
- 一致的程式碼格式
- 單引號優先
- 100 字元行寬

**NPM 腳本**:
```bash
npm run lint        # 檢查程式碼
npm run lint:fix    # 自動修正
npm run format      # 格式化程式碼
npm audit           # 安全審查
```

---

#### 5.4 常數管理 ([src/constants.mjs](src/constants.mjs))

**集中管理常數**:
```javascript
SMS_MAX_LENGTH = 1600           // SMS 最大長度
SMS_RATE_LIMIT_MAX = 10         // SMS 速率限制
API_RATE_LIMIT_MAX = 60         // API 速率限制
ERROR_RETRY_DELAY = 10000       // 錯誤重試延遲
HTTP_STATUS.OK = 200            // HTTP 狀態碼
```

**優點**:
- 易於維護
- 避免魔術數字
- 統一管理配置

---

#### 5.5 模組化設計

**檔案結構**:
```
src/
├── routerClient.mjs      # 路由器客戶端（主要邏輯）
├── routerProtocol.mjs    # 協定實作
├── routerEncryption.mjs  # 加密模組
├── httpClient.mjs        # HTTP 客戶端設定
├── validation.mjs        # 輸入驗證
├── constants.mjs         # 常數定義
├── axiosConfig.mjs       # 共用 Axios 設定
├── logger.mjs            # 日誌系統
└── controllers/
    ├── sms.mjs           # SMS API 控制器
    └── monitoring.mjs    # 監控端點（WIP）
```

**設計原則**:
- 單一職責原則
- 高內聚、低耦合
- 可測試性
- 可重用性

---

## 使用場景

### 6. 💼 實際應用場景

#### 6.1 系統監控告警

**場景**: 伺服器異常時發送 SMS 通知管理員

```bash
# 在監控腳本中
if [ $CPU_USAGE -gt 90 ]; then
  node sms-send.mjs "0912345678" "警告：CPU 使用率超過 90%"
fi
```

---

#### 6.2 雙因素認證 (2FA)

**場景**: Web 應用發送驗證碼

```javascript
// Node.js 應用
const code = generateRandomCode();
await axios.post('http://localhost:3000/api/v1/sms/outbox', {
  to: user.phone,
  content: `您的驗證碼是: ${code}`
}, {
  auth: { username: 'apiuser', password: 'password' }
});
```

---

#### 6.3 自動化通知系統

**場景**: 訂單狀態變更通知

```javascript
// 訂單完成時
app.post('/order/complete', async (req, res) => {
  const order = await Order.findById(req.body.orderId);

  await sendSMS(order.customer.phone,
    `您的訂單 #${order.id} 已完成，感謝您的購買！`);

  res.json({ success: true });
});
```

---

#### 6.4 IoT 設備通知

**場景**: 智慧家居設備告警

```python
# Python IoT 設備
import requests

def send_alert(message):
    requests.post(
        'http://192.168.1.100:3000/api/v1/sms/outbox',
        auth=('apiuser', 'password'),
        json={'to': '0912345678', 'content': message}
    )

# 當偵測到異常
if temperature > 50:
    send_alert('警告：溫度異常！當前溫度: {}°C'.format(temperature))
```

---

#### 6.5 客服自動回覆

**場景**: 接收客戶 SMS 並自動回覆

```bash
# 使用 sms-cat 處理訊息
node sms-cat.mjs | while read line; do
  FROM=$(echo $line | jq -r '.sms.from')
  CONTENT=$(echo $line | jq -r '.sms.content')

  if [[ $CONTENT == *"營業時間"* ]]; then
    node sms-send.mjs "$FROM" "我們的營業時間是週一至週五 9:00-18:00"
  fi
done
```

---

#### 6.6 郵件轉 SMS

**場景**: 重要郵件轉發到手機

```bash
# 郵件伺服器規則
# 將緊急郵件轉發到 SMTP Gateway
echo "緊急：伺服器離線" | mail -s "Alert" 0912345678@smtp2sms.local
```

---

## 完整功能清單

### ✅ 已實作功能

#### SMS 操作
- [x] 發送 SMS（命令列）
- [x] 發送 SMS（REST API）
- [x] 發送 SMS（SMTP）
- [x] 查詢收件匣
- [x] 查詢寄件匣
- [x] 篩選未讀訊息
- [x] 標記已讀
- [x] 刪除訊息
- [x] 即時監聽新訊息

#### 安全功能
- [x] Basic Authentication
- [x] 速率限制（SMS 和 API）
- [x] 輸入驗證（電話、內容）
- [x] 錯誤訊息清理
- [x] 設定檔驗證
- [x] 會話管理
- [x] 加密通訊

#### API 功能
- [x] RESTful API
- [x] Swagger UI 文件
- [x] JSON/Form 格式支援
- [x] 錯誤處理
- [x] 404 處理
- [x] CORS 支援（可選）

#### 工具功能
- [x] 環境檢查工具
- [x] 測試腳本
- [x] 程式碼檢查（ESLint）
- [x] 程式碼格式化（Prettier）
- [x] 安全審查（npm audit）

#### 文件
- [x] README（主要說明）
- [x] TESTING（測試指南）
- [x] QUICK_REFERENCE（快速參考）
- [x] FEATURES（本檔案）

---

### 🚧 進行中功能

- [ ] Prometheus 監控端點
- [ ] WebSocket 即時通知
- [ ] SMS 歷史記錄資料庫
- [ ] 單元測試
- [ ] Docker 完整支援

---

### 💡 未來可能的功能

- [ ] TypeScript 遷移
- [ ] GraphQL API
- [ ] 多路由器支援
- [ ] SMS 排程發送
- [ ] 群發功能
- [ ] 黑白名單
- [ ] SMS 範本
- [ ] 統計報表
- [ ] Web UI 管理介面

---

## 總結

**TP-Link SMS Forward** 是一個功能完整、安全可靠的 SMS 管理解決方案，提供：

🎯 **多種使用方式**：命令列、REST API、SMTP
📊 **完整的 SMS 管理**：發送、接收、查詢、刪除
🔒 **企業級安全**：認證、驗證、速率限制、加密
🛠️ **易於整合**：RESTful API、Swagger 文件
📖 **完善的文件**：使用說明、測試指南、範例

適合從個人專案到企業應用的各種場景！
