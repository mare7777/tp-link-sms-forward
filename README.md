# TP-Link SMS Forward 單一入口指南

本文件是專案的主入口，聚焦 **快速上線**、**功能矩陣** 與 **操作速查**。

## 文件地圖

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

> `sms-cat.mjs` 預設使用「進階模式」：以 `unread=true&unseenOnly=true` 搭配本地游標（`state/sms-cursor.json`）續接輪詢。

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

## `sms-cat.mjs` 進階模式（預設）與一致性限制

`sms-cat.mjs` 目前預設為「進階模式」，行為如下：

- 輪詢端點：`/api/v1/sms/inbox?unread=true&unseenOnly=true`
- 有游標時會附加 `fingerprint=<lastFingerprint>`（或 `since=<ISO time>`）
- 成功轉發後才更新 `state/sms-cursor.json`，確保程序重啟可續接
- 若指紋游標失效（例如 router 已清掉該訊息），自動回退為 `unread=true` 全掃並靠 dedup 避免重送

一致性限制（重要）：

- 路由器收件匣 API 一次只保留/返回最近 8 則訊息
- 若輪詢中斷過久、短時間湧入大量 SMS，可能發生最舊訊息被覆蓋而無法補抓
- 建議縮短輪詢間隔，並讓下游系統保留自己的持久化事件紀錄

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

---

## Synology NAS（Container Manager）部署指南

### 1) 建立專案與檔案

1. 在 NAS 建立資料夾（例如 `/volume1/docker/tp-link-sms-forward`）。
2. 放入以下檔案：
   - `docker-compose.synology.yml`
   - `config.json`（可先由 `config.example.json` 複製）
3. 到 Container Manager → **Project** → **Create**，選擇該資料夾與 compose 檔。

### 2) Volume 掛載路徑

本專案預設掛載：

- 主機：`/volume1/docker/tp-link-sms-forward/config.json`
- 容器：`/home/node/tp-link-modem-router-master/config.json`（唯讀）

> 若你偏好完全用 UI 填環境變數，也可保留最小 `config.json`，並以 `CONFIG_JSON` 或 `CONFIG__...` 覆寫。

### 3) Port 映射

- `api-bridge`: `3000:3000`
- `sms-cat`: 不需對外開放埠（透過內部網路連 `api-bridge`）

### 4) 參數對照（Synology UI 環境變數）

可直接在 Container Manager 的 Environment 區設定：

- Router login
  - `CONFIG__URL`
  - `CONFIG__LOGIN`
  - `CONFIG__PASSWORD`
- API users（Basic Auth）
  - `CONFIG__API_USERS__APIUSER`（例如 `apiuser` 的密碼）
- Telegram（若你在外部腳本轉送）
  - 建議自訂 `TG_BOT_TOKEN`、`TG_CHAT_ID`（供你的轉送腳本使用）

另外支援兩種覆寫方式：

1. `CONFIG_JSON`：整包 JSON 字串（會與檔案設定合併）
2. `CONFIG__...`：逐項覆寫（例如 `CONFIG__API_CLIENT_POLLING_DELAY=3000`）

### 5) 服務說明（雙服務）

- `api-bridge`：提供 REST API（含 `/api/v1/monitoring/health` 健康檢查）
- `sms-cat`：輪詢 API 收件匣並輸出/轉送 SMS

兩者共用同一份設定與同一個 Docker network，並啟用 `restart: unless-stopped`。

### 6) DS1502+ / DS1522+ 資源建議

- CPU / RAM
  - `api-bridge`: 0.2~0.5 vCPU、128~256MB RAM
  - `sms-cat`: 0.1~0.3 vCPU、64~128MB RAM
  - 建議專案總預留：`0.5~1 vCPU`、`256~512MB RAM`
- Log rotation
  - 建議啟用 Docker log rotation（例如 `max-size=10m`, `max-file=3`）避免長期膨脹
- 資料保留策略
  - `config.json` 納入 NAS 備份（Hyper Backup）
  - 容器 log 保留 7~30 天
  - 若有外部轉送紀錄（Webhook/DB），建議保留 90 天以上以利追查
