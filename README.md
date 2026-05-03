# TP-Link SMS Forward 單一入口指南

本文件是專案的「主入口」，聚焦在 **3 分鐘可上線**、**Telegram 轉送整合**、與 **即時性調校**。  
進階細節已拆分到：

- 架構與模組設計：[`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 功能全覽與情境：[`FEATURES.md`](./FEATURES.md)
- 測試方法：[`TESTING.md`](./TESTING.md)
- 操作速查：[`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)
- 專案總覽：[`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)

---

## 專案目的

這個專案讓你把 TP-Link Archer LTE 路由器的 SMS 功能程式化，提供三種核心能力：

1. 直接送 SMS（`sms-send.mjs`）
2. 暴露本機 REST API（`api-bridge.mjs`）
3. 持續拉取收件匣新簡訊（`sms-cat.mjs`）作為轉送管線入口

推薦把 `sms-cat.mjs` 視為「事件來源」，再串接你自己的通知端（例如 Telegram Bot）。

---

## 3 分鐘快速啟動

### 1) 安裝

```bash
npm install
# 或
# yarn install
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

收到新簡訊時，會輸出結構化日誌（含 `sms.from`、`sms.content`、`sms.receivedTime`）。

---

## Telegram 轉送整合範例（以 `sms-cat.mjs` 為核心）

下面示範最小可用流程：

1. `sms-cat.mjs` 輪詢 `/api/v1/sms/inbox`。
2. 偵測未讀簡訊後，標示已讀並輸出 JSON log。
3. 由你的轉送腳本讀取輸出，呼叫 Telegram Bot API。

### 範例管線

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

> 建議：先在 shell 設定 `TG_BOT_TOKEN` 與 `TG_CHAT_ID`，避免把機密寫入版本庫。

---

## 即時性調校（polling、retry、router 負載）

`sms-cat.mjs` 目前採 **輪詢模型**：每次抓收件匣、處理未讀、等待下一輪。即時性主要由 `api_client_polling_delay` 決定。

- **polling 間隔（`api_client_polling_delay`）**
  - 越小：越快收到通知、但對路由器與 API 負載越高。
  - 越大：較省資源、但通知延遲增加。
- **retry 行為（網路錯誤）**
  - 遇到連線錯誤會等待固定重試延遲後再試。
  - 遇到 502 會重連輪詢。
- **router 負載**
  - 同時開啟路由器 Web UI、第三方腳本、與高頻輪詢，常導致回應變慢或短暫異常。
  - 建議把此工具與人工 Web 管理操作時段錯開。

---

## 常見延遲原因與排查清單

1. **輪詢間隔過大**：先確認 `api_client_polling_delay`。
2. **路由器忙碌**：檢查是否同時有人在操作 Web UI。
3. **網路品質不穩**：觀察 `sms-cat.mjs` 是否頻繁出現重試錯誤。
4. **API Bridge 壓力高**：確認是否有其他服務頻繁讀取 `/api/v1/sms/inbox`。
5. **單機資源瓶頸**：若轉送腳本含外部 API 呼叫，避免在同一個同步迴圈中阻塞太久。

建議排查順序：

- Step 1：把 `api_client_polling_delay` 臨時調小測試（例如從 5000 改到 2000）。
- Step 2：停止其他管理流量（Web UI / 額外監控腳本）。
- Step 3：只保留 `api-bridge.mjs + sms-cat.mjs` 最小組合重測。

---

## 設定欄位名稱統一與程式碼對應

下表僅列最常用且與 SMS 轉送直接相關欄位，命名以 `config.example.json` 為準。

| 設定欄位 | 用途 | 主要使用位置 |
|---|---|---|
| `url` | 路由器 API 基底位址 | `api-bridge.mjs`, `sms-send.mjs` |
| `login` | 路由器帳號 | `api-bridge.mjs`, `sms-send.mjs` |
| `password` | 路由器密碼 | `api-bridge.mjs`, `sms-send.mjs` |
| `api_listen_host` | API Bridge 監聽位址 | `api-bridge.mjs` |
| `api_listen_port` | API Bridge 監聽埠 | `api-bridge.mjs` |
| `api_users` | API Basic Auth 使用者清單 | `api-bridge.mjs` |
| `api_client_url` | `sms-cat.mjs` 要連的 API Bridge 位址 | `sms-cat.mjs` |
| `api_client_login` | `sms-cat.mjs` API 使用者 | `sms-cat.mjs` |
| `api_client_password` | `sms-cat.mjs` API 密碼 | `sms-cat.mjs` |
| `api_client_polling_delay` | `sms-cat.mjs` 輪詢週期（毫秒） | `sms-cat.mjs` |

---

## 建議預設值（三種模板）

> 以下為建議起點，請依你的路由器與網路狀況微調。

### A. 家用網路（平衡）

```json
{
  "api_client_polling_delay": 5000
}
```

- 適合一般日常通知。
- 平衡即時性與設備負載。

### B. 告警用途（較即時）

```json
{
  "api_client_polling_delay": 2000
}
```

- 適合停電、設備離線、門禁觸發等通知。
- 需留意路由器 CPU 與 API 回應時間。

### C. 高即時用途（高頻）

```json
{
  "api_client_polling_delay": 1000
}
```

- 僅建議在路由器負載可控、網路穩定時使用。
- 如出現 502 / retry 增加，請回退到 2000 或 3000。

---

## 延伸閱讀（避免 README 重複）

- 系統內部流程與模組拆解：[`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 功能矩陣與使用情境：[`FEATURES.md`](./FEATURES.md)

