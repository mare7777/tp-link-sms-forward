# TP-Link SMS Forward 單一入口指南

本文件是專案的主入口，聚焦 **快速上線**、**功能矩陣** 與 **操作速查**。

## 文件地圖

- [`README.md`](./README.md)：快速上線、功能矩陣、常見整合模式
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)：系統架構與模組設計
- [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)：命令與 API 端點速查
- [`UI_ALIGNMENT.md`](./UI_ALIGNMENT.md)：MR600 Web UI 與 API/Telegram 流程對照

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

> `sms-cat.mjs` 預設使用「進階模式」：以 `unread=true&unseenOnly=true` 搭配本地游標（`state/sms-cursor.json`）續接輪詢，對齊 MR600 Web UI 的「進階 > 簡訊 > 收件夾 > 未讀取」流程。

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

## Docker / Image 打包

這個專案現在支援兩種容器設定方式：

1. 純環境變數啟動
2. `config.json` + 環境變數覆寫

若你要部署到 Synology DS1522+，建議直接使用 **預先打包好的 image + `docker-compose.synology.yml`**。這樣最穩，也不依賴 NAS 端現場 build。

### 本機打包 image

```bash
docker build -t tp-link-sms-forward:latest .
```

DS1522+ 是 x86_64 / amd64；若你在 Apple Silicon 或其他非 amd64 主機打包，請改用：

```bash
docker build --platform linux/amd64 -t tp-link-sms-forward:latest .
```

---

## GitHub Private Image（GHCR）

如果你的 GitHub repository 是 private，建議用 GitHub Actions 自動發布 image 到：

```text
ghcr.io/mare7777/tp-link-sms-forward
```

本 repo 已補上 workflow：

- [`.github/workflows/publish-ghcr.yml`](./.github/workflows/publish-ghcr.yml)

### Workflow 行為

- `push` 到 `main` 或 `master` 時發布 branch tag 與 `latest`
- `push` `v*` tag 時發布版本 tag
- 也可手動執行 `workflow_dispatch`
- 發布目標平台：`linux/amd64`

### GitHub Actions 需要的設定

這份 workflow 預設使用 `${{ secrets.GITHUB_TOKEN }}` 發布到 GHCR，所以 **不需要額外建立 Docker registry secret**。

但你需要確認：

1. Repository 已啟用 GitHub Actions
2. Workflow 對 `packages` 有寫入權限
3. 第一次發布後，GHCR package 有正確連到這個 repository

實務上請檢查：

- Repository `Settings -> Actions -> General`
- `Workflow permissions` 至少不要被政策限制到無法寫入 package
- GHCR package 建立後，確認 package 與此 repo 關聯

若你以前曾經手動 push 過同名 GHCR package，但 package 沒有連回這個 repository，GitHub 官方文件指出此時 workflow 內的 `GITHUB_TOKEN` 可能沒有推送權限。遇到這種情況，先到 GHCR package 設定把 package 連回 repo，再重新跑 workflow。

這份 workflow 已在 job 內宣告：

- `contents: read`
- `packages: write`

### 第一次發布後你會得到的 image tag

常見會有：

- `ghcr.io/mare7777/tp-link-sms-forward:latest`
- `ghcr.io/mare7777/tp-link-sms-forward:main` 或 `:master`
- `ghcr.io/mare7777/tp-link-sms-forward:sha-<commit>`
- `ghcr.io/mare7777/tp-link-sms-forward:v1.0.0` 這類版本 tag

### NAS 拉 private image 需要的 token

根據 GitHub Container Registry 官方文件，**拉 private image 建議使用 Personal Access Token (classic)**，至少要有：

- `read:packages`

若這個 PAT 也要存取其他 private repo 資源，再額外評估是否需要更大權限；只為了讓 NAS `docker login ghcr.io` 拉 private image，先從最小的 `read:packages` 開始。

建議建立一個專用 PAT，例如：

- 名稱：`synology-ghcr-readonly`
- Scope：`read:packages`

### Synology / Docker 登入 GHCR

在 NAS 上實際拉 image 前，需要先登入：

```bash
docker login ghcr.io -u GITHUB_USERNAME
```

密碼請輸入上面建立的 PAT classic。

成功後即可測試：

```bash
docker pull ghcr.io/mare7777/tp-link-sms-forward:latest
```

若要匯出給 Synology 匯入：

```bash
docker save -o tp-link-sms-forward.tar tp-link-sms-forward:latest
```

你也可以直接推到自己的 registry：

```bash
docker tag tp-link-sms-forward:latest your-registry.example.com/tp-link-sms-forward:latest
docker push your-registry.example.com/tp-link-sms-forward:latest
```

### 容器預設行為

- 預設命令：`node ./api-bridge.mjs`
- 工作目錄：`/app`
- 支援覆寫命令執行：
  - `node ./api-bridge.mjs`
  - `node ./sms-cat.mjs`
  - `node ./smtp-gateway.mjs`
- 健康檢查端點：`/api/v1/monitoring/health`

---

## Synology NAS（DS1522+ / Container Manager）部署指南

### 1) 先準備 NAS 資料夾

在 NAS 建立專案資料夾，例如：

```text
/volume1/docker/tp-link-sms-forward
```

建議至少放這些檔案：

- `docker-compose.synology.yml`
- `synology.env.example`
- `state/` 目錄

若你想保留檔案式設定，也可以另外放：

- `config.json`

### 2) 把 image 放進 Synology

有兩種常見方式：

1. 在其他機器 build 完後，將 `tp-link-sms-forward.tar` 匯入 Synology Container Manager 的 **Image** 頁面。
2. 推到 registry，然後讓 Synology 直接 pull。

若你使用的 image tag 不是 `tp-link-sms-forward:latest`，請同步修改 `IMAGE_NAME`。

### 3) 建立 `.env` 檔

從範例複製：

```bash
cp synology.env.example .env
```

至少要修改：

- `IMAGE_NAME`
- `CONFIG__URL`
- `CONFIG__LOGIN`
- `CONFIG__PASSWORD`
- `CONFIG__API_USERS__APIUSER`

若你要啟用 Telegram，也一併填入：

- `CONFIG__TELEGRAM_ENABLED=true`
- `CONFIG__TELEGRAM_BOT_TOKEN`
- `CONFIG__TELEGRAM_CHAT_ID`

若你是用 private GHCR image，`IMAGE_NAME` 建議填：

```text
ghcr.io/mare7777/tp-link-sms-forward:latest
```

或指定版本：

```text
ghcr.io/mare7777/tp-link-sms-forward:v1.0.0
```

### 4) 以 Project 方式部署

到 Synology Container Manager：

1. 進入 **Project**
2. 點 **Create**
3. 指向 `docker-compose.synology.yml`
4. 若 UI 支援 `.env` 檔，選同資料夾中的 `.env`
5. 啟動專案

`docker-compose.synology.yml` 會建立三個可直接運行的容器：

- `api-bridge`
- `sms-cat`
- `smtp-gateway`

其中：

- `api-bridge` 對外暴露 `3000`
- `smtp-gateway` 對外暴露 `1025`
- `sms-cat` 不對外開埠，只透過內部 network 存取 `api-bridge`

### 5) Volume 與持久化

目前 compose 預設持久化的是 `sms-cat` 的游標狀態：

- 主機：`./state`
- 容器：`/app/state`

這很重要，因為 `sms-cat` 會把游標寫到：

- `/app/state/sms-cursor.json`

若沒有持久化，容器重建後會失去已讀游標與 dedup 接續能力。

若你偏好使用 `config.json` 而不是純環境變數，建議自行額外掛載：

- 主機：`/volume1/docker/tp-link-sms-forward/config.json`
- 容器：`/app/config.json`

不過對 DS1522+ 而言，**純環境變數部署通常更簡單**。本專案已支援在沒有 `config.json` 的情況下直接啟動。

### 6) 設定方式

支援三層設定來源，後者覆蓋前者：

1. `config.json`
2. `CONFIG_JSON`
3. `CONFIG__...`

最推薦的是 `CONFIG__...`，因為最適合 Synology UI / `.env` 管理。

### 7) 常用環境變數對照

| 變數 | 用途 |
|---|---|
| `IMAGE_NAME` | Synology 專案實際使用的 image tag |
| `CONFIG__URL` | 路由器 URL，通常為 `http://192.168.1.1` |
| `CONFIG__LOGIN` | 路由器帳號 |
| `CONFIG__PASSWORD` | 路由器密碼 |
| `CONFIG__API_LISTEN_HOST` | API 監聽位址，容器內建議 `0.0.0.0` |
| `CONFIG__API_LISTEN_PORT` | API 埠，預設 `3000` |
| `CONFIG__API_USERS__APIUSER` | API Basic Auth 密碼 |
| `CONFIG__API_CLIENT_URL` | `sms-cat` 連到 `api-bridge` 的內網 URL |
| `CONFIG__API_CLIENT_LOGIN` | `sms-cat` 連線 API 用帳號 |
| `CONFIG__API_CLIENT_PASSWORD` | `sms-cat` 連線 API 用密碼 |
| `CONFIG__API_CLIENT_POLLING_DELAY` | 輪詢週期（毫秒） |
| `CONFIG__API_CLIENT_POLLING_JITTER_MS` | 輪詢 jitter（毫秒） |
| `CONFIG__SMS_GATEWAY_URL` | SMTP gateway 送信時要呼叫的 API URL |
| `CONFIG__SMS_GATEWAY_LOGIN` | SMTP gateway 呼叫 API 用帳號 |
| `CONFIG__SMS_GATEWAY_PASSWORD` | SMTP gateway 呼叫 API 用密碼 |
| `CONFIG__SMS_GATEWAY_DOMAIN` | SMTP 收件網域，例如 `smtp2sms.local` |
| `CONFIG__SMS_GATEWAY_LISTEN_PORT` | SMTP gateway 對外埠，預設 `1025` |
| `CONFIG__SMS_DELIVERY_MODE` | `at_least_once` 或 `at_most_once` |
| `CONFIG__TELEGRAM_ENABLED` | `true` / `false` |
| `CONFIG__TELEGRAM_BOT_TOKEN` | Telegram Bot Token |
| `CONFIG__TELEGRAM_CHAT_ID` | Telegram Chat ID |

### 8) 驗證部署是否成功

若 image 來源是 private GHCR，先確認 NAS 已能成功登入並拉到 image；否則 Project 啟動前就會卡在 image pull。

先確認 `api-bridge` 有起來：

```bash
curl -u apiuser:你的API密碼 http://NAS-IP:3000/api/v1/monitoring/health
```

預期會得到類似：

```json
{"status":200,"data":{"ok":true,"service":"api-bridge","uptimeSeconds":12,"timestamp":"2026-05-06T05:16:03.623Z"}}
```

接著可以再測：

```bash
curl -u apiuser:你的API密碼 http://NAS-IP:3000/api/v1/sms/inbox?unread=true
```

### 9) DS1522+ 資源建議

- `api-bridge`：0.2 到 0.5 vCPU、128 到 256 MB RAM
- `sms-cat`：0.1 到 0.3 vCPU、64 到 128 MB RAM
- `smtp-gateway`：0.1 到 0.2 vCPU、64 到 128 MB RAM
- 整體建議預留：0.5 到 1 vCPU、256 到 512 MB RAM

### 10) 建議的實務設定

- 開啟 `restart: unless-stopped`
- 為容器 log 設 rotation，例如 `max-size=10m`、`max-file=3`
- 將 `.env`、`config.json`（若有）與 `state/` 一起納入 NAS 備份
- 若對外暴露 `3000`，務必使用強密碼取代 `CONFIG__API_USERS__APIUSER` 預設值
