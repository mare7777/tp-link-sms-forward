# TP-Link SMS Forward Synology DS1522+ Container Manager 使用說明手冊

產出日期：2026-05-13  
適用設備：Synology DS1522+，DSM 7.x，Container Manager  
適用專案：`mare7777/tp-link-sms-forward`

## 1. 專案用途

本專案把 TP-Link Archer LTE 路由器的 SMS 功能包成三個容器服務：

| 服務 | 容器名稱 | 用途 | 對外連接埠 |
|---|---|---|---|
| API Bridge | `tp-link-api-bridge` | 提供 HTTP API 與 Swagger 頁面，用來查詢、發送、刪除、標記 SMS | `3000` |
| SMS Cat | `tp-link-sms-cat` | 持續輪詢未讀 SMS，輸出 log，可搭配 Telegram 轉送 | 無 |
| SMTP Gateway | `tp-link-smtp-gateway` | 接收 Email，轉成 SMS 發送 | `1025` |

建議 DS1522+ 使用 `docker-compose.synology.yml` 以 Project 方式部署。

## 2. 部署前準備

你需要先準備：

1. Synology DS1522+ 已安裝 Container Manager。
2. NAS 能連到 TP-Link 路由器管理 IP，例如 `http://192.168.1.1`。
3. 已知道 TP-Link 路由器管理帳號與密碼。
4. 已準備一組 API 密碼，供 API Bridge、SMS Cat、SMTP Gateway 內部互相驗證。
5. 如果使用 private GHCR image，需準備 GitHub Personal Access Token classic，至少具備 `read:packages`。

建議 NAS 目錄：

```text
/volume1/docker/tp-link-sms-forward
```

目錄內建議放：

```text
docker-compose.synology.yml
.env
state/
```

`state/` 用來保存 `sms-cat` 的接續游標，避免容器重建後重複轉送或漏接續。

## 3. Image 來源建議

### 方式 A：使用 GHCR image，推薦

`.env` 內使用：

```env
IMAGE_NAME=ghcr.io/mare7777/tp-link-sms-forward:latest
```

如果 repository 或 package 是 private，先在 NAS 或可操作 Docker 的機器登入：

```bash
docker login ghcr.io -u GITHUB_USERNAME
```

密碼輸入 GitHub PAT classic。

### 方式 B：本機 build 後匯入 Synology

在可 build Docker image 的電腦上執行：

```bash
docker build --platform linux/amd64 -t tp-link-sms-forward:latest .
docker save -o tp-link-sms-forward.tar tp-link-sms-forward:latest
```

DS1522+ 是 amd64 架構，所以 Apple Silicon 或其他非 amd64 主機 build 時務必指定 `--platform linux/amd64`。

到 Synology Container Manager 的 Image 頁面匯入 `tp-link-sms-forward.tar`。

## 4. `.env` 範本

在 `/volume1/docker/tp-link-sms-forward/.env` 建立下列內容，並替換密碼：

```env
IMAGE_NAME=ghcr.io/mare7777/tp-link-sms-forward:latest

CONFIG__URL=http://192.168.1.1
CONFIG__LOGIN=admin
CONFIG__PASSWORD=replace-with-router-password

CONFIG__API_LISTEN_HOST=0.0.0.0
CONFIG__API_LISTEN_PORT=3000
CONFIG__API_USERS__APIUSER=replace-with-api-password

CONFIG__API_CLIENT_URL=http://api-bridge:3000
CONFIG__API_CLIENT_LOGIN=apiuser
CONFIG__API_CLIENT_PASSWORD=replace-with-api-password
CONFIG__API_CLIENT_POLLING_DELAY=3000
CONFIG__API_CLIENT_POLLING_JITTER_MS=500

CONFIG__SMS_GATEWAY_URL=http://api-bridge:3000
CONFIG__SMS_GATEWAY_LOGIN=apiuser
CONFIG__SMS_GATEWAY_PASSWORD=replace-with-api-password
CONFIG__SMS_GATEWAY_DOMAIN=smtp2sms.local
CONFIG__SMS_GATEWAY_LISTEN_HOST=0.0.0.0
CONFIG__SMS_GATEWAY_LISTEN_PORT=1025

CONFIG__SMS_DELIVERY_MODE=at_least_once

CONFIG__TELEGRAM_ENABLED=false
CONFIG__TELEGRAM_BOT_TOKEN=
CONFIG__TELEGRAM_CHAT_ID=
CONFIG__TELEGRAM_MAX_RETRIES=3
CONFIG__TELEGRAM_RETRY_INITIAL_BACKOFF_MS=1000
CONFIG__TELEGRAM_RETRY_MAX_BACKOFF_MS=10000
CONFIG__TELEGRAM_TIMEOUT_MS=10000
```

請務必讓以下三個密碼一致：

```env
CONFIG__API_USERS__APIUSER=replace-with-api-password
CONFIG__API_CLIENT_PASSWORD=replace-with-api-password
CONFIG__SMS_GATEWAY_PASSWORD=replace-with-api-password
```

## 5. 在 Container Manager 建立 Project

1. 開啟 DSM。
2. 進入 Container Manager。
3. 進入 Project。
4. 點選 Create。
5. Project path 選 `/volume1/docker/tp-link-sms-forward`。
6. Compose file 選 `docker-compose.synology.yml`。
7. 確認同目錄有 `.env`。
8. 建立並啟動 Project。

啟動後應看到三個容器：

```text
tp-link-api-bridge
tp-link-sms-cat
tp-link-smtp-gateway
```

啟動順序：

1. `api-bridge` 先啟動。
2. `api-bridge` 健康檢查通過。
3. `sms-cat` 與 `smtp-gateway` 再啟動。

## 6. 部署後驗證

把 `NAS-IP` 換成你的 NAS IP，把 `replace-with-api-password` 換成 API 密碼。

### 6.1 API 健康檢查

```bash
curl -u apiuser:replace-with-api-password http://NAS-IP:3000/api/v1/monitoring/health
```

預期回應：

```json
{"status":200,"data":{"ok":true,"service":"api-bridge"}}
```

### 6.2 Swagger 頁面

瀏覽器開啟：

```text
http://NAS-IP:3000/
```

應可看到 API 文件頁。

### 6.3 查詢收件匣

```bash
curl -u apiuser:replace-with-api-password "http://NAS-IP:3000/api/v1/sms/inbox?unread=true"
```

如果路由器帳密、SIM、路由器 SMS 功能正常，會回傳 SMS 清單。

### 6.4 發送 SMS

```bash
curl -u apiuser:replace-with-api-password \
  -X POST "http://NAS-IP:3000/api/v1/sms/outbox" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "to=0912345678" \
  -d "content=Synology test"
```

### 6.5 SMTP 轉 SMS

SMTP Gateway 對外連接埠是 `1025`。收件地址格式：

```text
0912345678@smtp2sms.local
```

可用支援 SMTP 的系統寄信到：

```text
NAS-IP:1025
```

信件純文字內容會轉成 SMS 內容。

## 7. Telegram 轉送設定

如果要把收到的 SMS 轉送到 Telegram：

```env
CONFIG__TELEGRAM_ENABLED=true
CONFIG__TELEGRAM_BOT_TOKEN=123456:your-bot-token
CONFIG__TELEGRAM_CHAT_ID=your-chat-id
```

套用後重建或重新啟動 Project。

`sms-cat` 在收到新 SMS 後會：

1. 從 API Bridge 讀取未讀 SMS。
2. 寫入 log。
3. 呼叫 Telegram Bot API。
4. 成功或略過轉送後標記該 SMS 已讀。
5. 更新 `/app/state/sms-cursor.json`。

## 8. 輪詢與可靠性設定

建議先使用平衡值：

```env
CONFIG__API_CLIENT_POLLING_DELAY=3000
CONFIG__API_CLIENT_POLLING_JITTER_MS=500
```

較即時：

```env
CONFIG__API_CLIENT_POLLING_DELAY=1500
CONFIG__API_CLIENT_POLLING_JITTER_MS=300
```

較低負載：

```env
CONFIG__API_CLIENT_POLLING_DELAY=5000
CONFIG__API_CLIENT_POLLING_JITTER_MS=1000
```

`CONFIG__SMS_DELIVERY_MODE` 可用：

| 值 | 行為 |
|---|---|
| `at_least_once` | Telegram 或 callback 成功後才標已讀，較不容易漏轉送 |
| `at_most_once` | 處理後即標已讀，較不容易重複，但下游失敗時可能漏轉送 |

建議使用：

```env
CONFIG__SMS_DELIVERY_MODE=at_least_once
```

## 9. DS1522+ 資源建議

| 服務 | CPU 建議 | RAM 建議 |
|---|---:|---:|
| API Bridge | 0.2 到 0.5 vCPU | 128 到 256 MB |
| SMS Cat | 0.1 到 0.3 vCPU | 64 到 128 MB |
| SMTP Gateway | 0.1 到 0.2 vCPU | 64 到 128 MB |

整體建議預留：

```text
0.5 到 1 vCPU
256 到 512 MB RAM
```

## 10. 維運建議

1. 啟用 `restart: unless-stopped`，目前 compose 已設定。
2. 保留 `state/`，不要在升級時刪除。
3. 把 `.env` 和 `state/` 納入 NAS 備份。
4. API 密碼不要使用範例值。
5. 不建議直接把 `3000` 暴露到公網。若需外部使用，請放在 VPN 或反向代理加 HTTPS 後面。
6. 定期更新 image。使用 GHCR 時可在 Container Manager 重新 pull latest 並重建 Project。

## 11. 升級流程

### 使用 GHCR latest

1. Container Manager 進入 Image。
2. 重新 pull `ghcr.io/mare7777/tp-link-sms-forward:latest`。
3. 回到 Project。
4. Stop Project。
5. Build/Start 或 Recreate Project。
6. 驗證 `/api/v1/monitoring/health`。
7. 檢查 `sms-cat` log 是否正常輪詢。

### 使用固定版本 tag

把 `.env` 改成指定 tag：

```env
IMAGE_NAME=ghcr.io/mare7777/tp-link-sms-forward:v1.0.0
```

再重建 Project。

## 12. 常見問題

### API 健康檢查 401

代表 Basic Auth 沒帶或密碼錯。確認：

```env
CONFIG__API_USERS__APIUSER
```

curl 要使用：

```bash
curl -u apiuser:你的API密碼 http://NAS-IP:3000/api/v1/monitoring/health
```

### API 查 SMS 回 500

通常是路由器連線、帳密或 TP-Link SMS API 回應問題。請確認：

1. NAS 可以連到 `CONFIG__URL`。
2. `CONFIG__LOGIN` 和 `CONFIG__PASSWORD` 正確。
3. 路由器 Web UI 沒有同時要求重新登入或驗證。
4. SIM 卡可用，SMS 功能正常。

### `sms-cat` 重複轉送

檢查 `state/` 是否有持久化掛載：

```text
./state:/app/state
```

並確認 NAS 目錄可寫。

### SMTP 收件失敗

收件地址必須符合：

```text
數字@smtp2sms.local
```

例如：

```text
0912345678@smtp2sms.local
```

如果你修改 `CONFIG__SMS_GATEWAY_DOMAIN`，收件地址 domain 也要跟著改。

### GHCR private image 拉不下來

確認：

1. 已登入 `ghcr.io`。
2. PAT classic 至少有 `read:packages`。
3. GHCR package 對該帳號可讀。
4. `.env` 的 `IMAGE_NAME` 正確。

## 13. 本次檢查紀錄

本機檢查時間：2026-05-13，Asia/Taipei。

已通過：

1. Node.js 版本：`v22.14.0`。
2. 全部 `.mjs` / `.js` 檔案語法檢查通過。
3. API Bridge 可啟動。
4. `/api/v1/monitoring/health` 以 Basic Auth 回傳 200。
5. 未授權健康檢查回傳 401。
6. Swagger 首頁回傳 200。
7. `/api/v1/sms/outbox` 對錯誤手機號碼回傳 400。
8. `sms-cat` 使用 mock API 成功讀取未讀 SMS、輸出 log、PATCH 標記已讀、寫入 cursor。
9. `smtp-gateway` 使用 mock API 成功接收 SMTP、解析文字、呼叫 `/api/v1/sms/outbox`。
10. `docker-compose.synology.yml` 可由 Docker Compose 正確解析。

需注意：

1. `npm run lint` 目前無法完成，因為專案使用 ESLint 9，但沒有 `eslint.config.js`。
2. `npm run format:check` 顯示既有檔案格式未套用 Prettier。
3. `npm audit` 無法執行，因為專案沒有 `package-lock.json`，目前使用的是 `yarn.lock`。
4. 本機 Docker Desktop 對 `C:\Users\mare7\.docker\buildx\instances` 拒絕存取，因此本次沒有完成本機 Docker image build。
5. 真實 SMS 發送、真實路由器收件匣、SIM 卡收發能力，必須在 DS1522+ 能連到 TP-Link 路由器的實機環境中驗證。

## 14. 最小上線檢查表

部署完成後請逐項確認：

```text
[ ] Project 中三個容器都已啟動
[ ] api-bridge health check 正常
[ ] http://NAS-IP:3000/ 可開啟 Swagger
[ ] curl 查詢 inbox 能連到路由器
[ ] 測試發送一封 SMS 成功
[ ] sms-cat log 看得到輪詢或收到 SMS
[ ] state/sms-cursor.json 有被建立
[ ] SMTP Gateway 可收信並轉成 SMS
[ ] .env 已備份
[ ] API 密碼不是範例值
```

## Container Manager editor note

- Prefer `Upload docker-compose.yml` in Synology Container Manager.
- Avoid `Create docker-compose.yml` in the DSM editor for this project.
- The Synology compose file in this repo is intentionally expanded without YAML anchors to maximize DSM compatibility.

## 2026-05-31 deployment notes

- `docker-compose.synology.yml` now uses a named volume `sms_state` for `sms-cat` instead of `./state`.
- This avoids Synology project-start failures when the project path exists but the `state` folder does not.
- The container health check now calls `http://127.0.0.1:3000/healthz` without Basic Auth.
- `/healthz` is intended only for container liveness/readiness checks inside Docker.
- Prefer `Upload docker-compose.yml` in Container Manager instead of editing YAML in the DSM editor.

- `CONFIG__SMS_LOG_FULL_CONTENT=false` is the recommended default so runtime logs do not store full SMS bodies.
