#!/bin/bash

# TP-Link SMS Forward API 測試腳本
# 確保 API Bridge 已經啟動: node api-bridge.mjs

# 設定變數
API_URL="http://127.0.0.1:3000"
API_USER="apiuser"
API_PASS="pleasechangeme"  # 請改為您的 API 密碼
TEST_PHONE="0912345678"     # 請改為測試用的電話號碼

echo "================================"
echo "TP-Link SMS API 測試腳本"
echo "================================"
echo ""

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試 1: 檢查 API 是否啟動
echo -e "${YELLOW}測試 1: 檢查 API 是否啟動${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/")
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ API 正常運作 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ API 無法連接 (HTTP $HTTP_CODE)${NC}"
    echo "  請確認 api-bridge.mjs 已啟動"
    exit 1
fi
echo ""

# 測試 2: 查詢收件匣
echo -e "${YELLOW}測試 2: 查詢 SMS 收件匣${NC}"
RESPONSE=$(curl -s --user "$API_USER:$API_PASS" \
  -X GET "$API_URL/api/v1/sms/inbox" \
  -H "accept: application/json")

if echo "$RESPONSE" | grep -q '"status":200'; then
    echo -e "${GREEN}✓ 查詢成功${NC}"
    echo "  回應: $RESPONSE" | head -c 100
    echo "..."
else
    echo -e "${RED}✗ 查詢失敗${NC}"
    echo "  回應: $RESPONSE"
fi
echo ""

# 測試 3: 發送 SMS
echo -e "${YELLOW}測試 3: 發送 SMS${NC}"
RESPONSE=$(curl -s --user "$API_USER:$API_PASS" \
  -d "to=$TEST_PHONE" \
  -d "content=API測試訊息 - $(date +%H:%M:%S)" \
  -X POST "$API_URL/api/v1/sms/outbox" \
  -H "accept: application/json")

if echo "$RESPONSE" | grep -q '"status":200'; then
    echo -e "${GREEN}✓ 發送成功${NC}"
    echo "  已發送到: $TEST_PHONE"
else
    echo -e "${RED}✗ 發送失敗${NC}"
    echo "  回應: $RESPONSE"
fi
echo ""

# 測試 4: 輸入驗證 - 無效電話號碼
echo -e "${YELLOW}測試 4: 輸入驗證（無效電話）${NC}"
RESPONSE=$(curl -s --user "$API_USER:$API_PASS" \
  -d "to=invalid" \
  -d "content=測試" \
  -X POST "$API_URL/api/v1/sms/outbox" \
  -H "accept: application/json")

if echo "$RESPONSE" | grep -q '"status":400'; then
    echo -e "${GREEN}✓ 正確拒絕無效電話號碼${NC}"
else
    echo -e "${RED}✗ 驗證未正常運作${NC}"
    echo "  回應: $RESPONSE"
fi
echo ""

# 測試 5: 輸入驗證 - 空內容
echo -e "${YELLOW}測試 5: 輸入驗證（空內容）${NC}"
RESPONSE=$(curl -s --user "$API_USER:$API_PASS" \
  -d "to=$TEST_PHONE" \
  -d "content=" \
  -X POST "$API_URL/api/v1/sms/outbox" \
  -H "accept: application/json")

if echo "$RESPONSE" | grep -q '"status":400'; then
    echo -e "${GREEN}✓ 正確拒絕空內容${NC}"
else
    echo -e "${RED}✗ 驗證未正常運作${NC}"
    echo "  回應: $RESPONSE"
fi
echo ""

# 測試 6: 認證失敗
echo -e "${YELLOW}測試 6: 認證測試（錯誤密碼）${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --user "$API_USER:wrongpassword" \
  -X GET "$API_URL/api/v1/sms/inbox")

if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ 正確拒絕錯誤密碼 (HTTP 401)${NC}"
else
    echo -e "${RED}✗ 認證檢查異常 (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# 測試 7: 查詢寄件匣
echo -e "${YELLOW}測試 7: 查詢 SMS 寄件匣${NC}"
RESPONSE=$(curl -s --user "$API_USER:$API_PASS" \
  -X GET "$API_URL/api/v1/sms/outbox" \
  -H "accept: application/json")

if echo "$RESPONSE" | grep -q '"status":200'; then
    echo -e "${GREEN}✓ 查詢成功${NC}"
    echo "  回應: $RESPONSE" | head -c 100
    echo "..."
else
    echo -e "${RED}✗ 查詢失敗${NC}"
    echo "  回應: $RESPONSE"
fi
echo ""

echo "================================"
echo "測試完成"
echo "================================"
