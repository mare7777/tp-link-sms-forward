# 專案總覽

## 🎯 專案簡介

**TP-Link SMS Forward** 是一個針對 TP-Link Archer LTE 路由器的 SMS 管理工具，讓您能夠通過程式化方式發送和接收 SMS 訊息。

### 一句話描述
> 將 TP-Link 4G LTE 路由器變成可程式化的 SMS 閘道

---

## 📊 核心功能概覽

| 功能類別 | 說明 | 檔案 |
|---------|------|------|
| **命令列發送** | 快速從終端機發送 SMS | [sms-send.mjs](sms-send.mjs) |
| **REST API** | HTTP API 整合，支援 Web 應用 | [api-bridge.mjs](api-bridge.mjs) |
| **SMTP 閘道** | 郵件轉 SMS | [smtp-gateway.mjs](smtp-gateway.mjs) |
| **即時監聽** | 持續接收新 SMS | [sms-cat.mjs](sms-cat.mjs) |
| **Swagger UI** | 互動式 API 文件 | http://localhost:3000 |

---

## 🚀 5 分鐘快速開始

### 步驟 1: 安裝
```bash
npm install
```

### 步驟 2: 設定
```bash
cp config.example.json config.json
# 編輯 config.json 填入路由器資訊
```

### 步驟 3: 測試
```bash
node test-setup.mjs
```

### 步驟 4: 發送第一則 SMS
```bash
node sms-send.mjs "0912345678" "Hello!"
```

### 步驟 5: 啟動 API
```bash
node api-bridge.mjs
# 開啟瀏覽器: http://127.0.0.1:3000
```

---

## 💡 典型使用場景

### 1️⃣ 系統告警通知
```bash
# 伺服器監控腳本
if [ $DISK_USAGE -gt 90 ]; then
  node sms-send.mjs "0912345678" "警告：磁碟使用率 $DISK_USAGE%"
fi
```

### 2️⃣ 雙因素認證 (2FA)
```javascript
// Node.js 應用
await axios.post('http://localhost:3000/api/v1/sms/outbox', {
  to: user.phone,
  content: `驗證碼: ${code}`
}, {
  auth: { username: 'apiuser', password: 'password' }
});
```

### 3️⃣ 自動回覆系統
```bash
# 監聽並自動回覆
node sms-cat.mjs | while read line; do
  # 處理收到的訊息並自動回覆
done
```

---

## 📁 專案結構

```
tp-link-sms_forward/
│
├── 主要程式
│   ├── api-bridge.mjs      # REST API 伺服器 ⭐
│   ├── sms-send.mjs        # 命令列發送工具 ⭐
│   ├── sms-cat.mjs         # SMS 接收監聽器 ⭐
│   └── smtp-gateway.mjs    # SMTP 轉 SMS 閘道
│
├── 核心模組 (src/)
│   ├── routerClient.mjs    # 路由器通訊客戶端
│   ├── routerProtocol.mjs  # 協定實作
│   ├── routerEncryption.mjs # 加密/解密
│   ├── validation.mjs      # 輸入驗證
│   ├── constants.mjs       # 常數定義
│   └── controllers/
│       └── sms.mjs         # SMS API 控制器
│
├── 文件
│   ├── README.md           # 主要說明 📖
│   ├── FEATURES.md         # 功能詳細說明 📖
│   ├── TESTING.md          # 測試指南 🧪
│   ├── QUICK_REFERENCE.md  # 快速參考 📝
│   ├── ARCHITECTURE.md     # 架構說明 🏗️
│   └── PROJECT_OVERVIEW.md # 本檔案 📋
│
├── 測試工具
│   ├── test-setup.mjs      # 環境檢查工具
│   └── examples/
│       ├── test-api.sh     # API 測試腳本 (Linux/Mac)
│       └── test-api.bat    # API 測試腳本 (Windows)
│
└── 設定
    ├── config.example.json # 設定檔範例
    ├── .eslintrc.json      # ESLint 設定
    └── .prettierrc.json    # Prettier 設定
```

---

## 🔧 核心技術

| 技術 | 用途 | 版本 |
|-----|------|------|
| **Node.js** | 執行環境 | ≥ 14.x |
| **Express.js** | Web 框架 | 4.21+ |
| **Axios** | HTTP 客戶端 | 1.7+ |
| **RSA-512** | 認證加密 | - |
| **AES-128-CBC** | 資料加密 | - |
| **Winston** | 日誌系統 | 3.17+ |
| **Swagger** | API 文件 | 6.2+ |

---

## 🔒 安全特性

✅ **Basic Authentication** - API 需要認證
✅ **速率限制** - 防止濫用 (10 SMS/min, 60 API/min)
✅ **輸入驗證** - 電話號碼、SMS 內容格式檢查
✅ **加密通訊** - RSA + AES 雙重加密
✅ **錯誤清理** - 不洩漏敏感資訊
✅ **會話管理** - 自動處理過期

---

## 📚 文件導航

依照您的需求選擇適合的文件：

| 我想要... | 閱讀這個 |
|----------|---------|
| 快速開始使用 | [README.md](README.md) |
| 了解所有功能 | [FEATURES.md](FEATURES.md) |
| 測試專案 | [TESTING.md](TESTING.md) |
| 查看常用命令 | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) |
| 理解系統架構 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 專案概覽 | [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) (本檔案) |

---

## 🎨 API 預覽

### 查詢收件匣
```bash
curl --user apiuser:password \
  http://127.0.0.1:3000/api/v1/sms/inbox
```

### 發送 SMS
```bash
curl --user apiuser:password \
  -H "Content-Type: application/json" \
  -d '{"to":"0912345678","content":"測試"}' \
  http://127.0.0.1:3000/api/v1/sms/outbox
```

### Swagger UI
```
http://127.0.0.1:3000
```
互動式 API 文件，可直接測試所有端點

---

## 📊 系統流程圖

### 發送 SMS
```
使用者 → 應用程式 → 驗證 → 路由器客戶端
       → 加密 → HTTP 請求 → 路由器 → 電信網路 → 接收者
```

### 接收 SMS
```
發送者 → 電信網路 → 路由器 → 儲存
       → API/輪詢 → 解析 → 回傳 → 使用者
```

---

## ⚙️ 設定檔範例

### 最小設定（僅發送 SMS）
```json
{
  "url": "http://192.168.1.1",
  "login": "admin",
  "password": "your_password"
}
```

### 完整設定（所有功能）
```json
{
  "url": "http://192.168.1.1",
  "login": "admin",
  "password": "your_router_password",
  "api_listen_host": "127.0.0.1",
  "api_listen_port": 3000,
  "api_users": {
    "apiuser": "your_api_password"
  }
}
```

---

## 🛠️ 常用命令速查

| 動作 | 命令 |
|-----|------|
| 檢查環境 | `node test-setup.mjs` |
| 發送 SMS | `node sms-send.mjs "號碼" "訊息"` |
| 啟動 API | `node api-bridge.mjs` |
| 監聽 SMS | `node sms-cat.mjs` |
| 程式碼檢查 | `npm run lint` |
| 安全審查 | `npm audit` |

---

## 🎯 適用對象

| 對象 | 用途 |
|-----|------|
| **開發者** | 整合 SMS 功能到應用程式 |
| **系統管理員** | 設定伺服器告警通知 |
| **DevOps** | 自動化監控和通知 |
| **測試人員** | SMS 相關功能測試 |
| **一般使用者** | 命令列發送 SMS |

---

## 📈 專案統計

- **程式語言**: JavaScript (ES Modules)
- **程式檔案**: 15+ 個 .mjs 檔案
- **文件檔案**: 6 個完整文件
- **核心功能**: 4 大功能（發送、接收、API、SMTP）
- **支援路由器**: 3 個型號
- **API 端點**: 8 個 REST 端點
- **測試工具**: 3 個自動化測試腳本

---

## 🌟 特色亮點

### ✨ 易用性
- 5 分鐘內可開始使用
- 詳細的文件和範例
- 自動化測試工具

### 🔐 安全性
- 企業級加密標準
- 多層安全防護
- 定期安全更新

### 🚀 效能
- 自動重試機制
- 速率限制保護
- 連線池管理

### 📖 文件
- 6 份完整文件
- 程式碼內註解
- Swagger API 文件

### 🧪 可測試性
- 環境檢查工具
- API 測試腳本
- 完整測試指南

---

## ❓ 常見問題

### Q: 支援哪些路由器？
A: TP-Link Archer MR200 v5, MR600, TL-MR6400 v5

### Q: 需要什麼權限？
A: 需要路由器管理員權限，且必須在同一網路

### Q: 可以同時發送多則 SMS 嗎？
A: 可以，但受速率限制 (10 則/分鐘)

### Q: 是否支援長 SMS？
A: 支援最多 1600 字元

### Q: 需要特殊的 SIM 卡嗎？
A: 不需要，一般 SIM 卡即可

---

## 🔗 相關資源

- **GitHub**: https://github.com/plewin/tp-link-modem-router
- **Issues**: https://github.com/plewin/tp-link-modem-router/issues
- **文件**: 查看專案內的 `.md` 檔案

---

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

---

## 📄 授權

請查看 [LICENSE](LICENSE) 檔案

---

**需要協助？** 查看其他文件或在 GitHub 上提問！
