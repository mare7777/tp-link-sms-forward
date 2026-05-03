@echo off
REM TP-Link SMS Forward API 測試腳本 (Windows)
REM 確保 API Bridge 已經啟動: node api-bridge.mjs

setlocal enabledelayedexpansion

REM 設定變數
set API_URL=http://127.0.0.1:3000
set API_USER=apiuser
set API_PASS=pleasechangeme
set TEST_PHONE=0912345678

echo ================================
echo TP-Link SMS API 測試腳本
echo ================================
echo.

REM 檢查 curl 是否可用
where curl >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 curl 命令
    echo 請使用 Windows 10 1803 或更新版本
    echo 或下載 curl: https://curl.se/windows/
    exit /b 1
)

REM 測試 1: 檢查 API 是否啟動
echo [測試 1] 檢查 API 是否啟動
curl -s -o nul -w "HTTP %%{http_code}" %API_URL%/
if %errorlevel% equ 0 (
    echo [成功] API 正常運作
) else (
    echo [失敗] API 無法連接
    echo 請確認 api-bridge.mjs 已啟動
    exit /b 1
)
echo.

REM 測試 2: 查詢收件匣
echo [測試 2] 查詢 SMS 收件匣
curl -s --user %API_USER%:%API_PASS% ^
  -X GET "%API_URL%/api/v1/sms/inbox" ^
  -H "accept: application/json"
echo.
echo.

REM 測試 3: 發送 SMS
echo [測試 3] 發送 SMS
curl -s --user %API_USER%:%API_PASS% ^
  -d "to=%TEST_PHONE%" ^
  -d "content=API測試訊息" ^
  -X POST "%API_URL%/api/v1/sms/outbox" ^
  -H "accept: application/json"
echo.
echo.

REM 測試 4: 輸入驗證 - 無效電話號碼
echo [測試 4] 輸入驗證（無效電話）
curl -s --user %API_USER%:%API_PASS% ^
  -d "to=invalid" ^
  -d "content=測試" ^
  -X POST "%API_URL%/api/v1/sms/outbox" ^
  -H "accept: application/json"
echo.
echo.

REM 測試 5: 查詢寄件匣
echo [測試 5] 查詢 SMS 寄件匣
curl -s --user %API_USER%:%API_PASS% ^
  -X GET "%API_URL%/api/v1/sms/outbox" ^
  -H "accept: application/json"
echo.
echo.

echo ================================
echo 測試完成
echo ================================
echo.
echo 提示:
echo - 如果看到 "status":200，表示成功
echo - 如果看到 "status":400 或 500，表示有錯誤
echo - 詳細資訊請查看 TESTING.md

pause
