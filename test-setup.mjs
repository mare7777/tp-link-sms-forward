#!/usr/bin/env node

/**
 * 快速測試腳本 - 檢查環境和設定
 */

import fs from 'fs';
import { validateConfig } from './src/validation.mjs';

console.log('='.repeat(60));
console.log('TP-Link SMS Forward - 環境檢查');
console.log('='.repeat(60));
console.log('');

let allChecksPass = true;

// 檢查 1: Node.js 版本
console.log('📋 檢查 1: Node.js 版本');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 14) {
  console.log(`✅ Node.js ${nodeVersion} (符合要求: >= 14.x)`);
} else {
  console.log(`❌ Node.js ${nodeVersion} (需要: >= 14.x)`);
  allChecksPass = false;
}
console.log('');

// 檢查 2: 依賴套件
console.log('📋 檢查 2: node_modules');
if (fs.existsSync('./node_modules')) {
  console.log('✅ node_modules 存在');

  // 檢查關鍵套件
  const criticalPackages = ['axios', 'express', 'winston'];
  let allPackagesExist = true;

  for (const pkg of criticalPackages) {
    if (!fs.existsSync(`./node_modules/${pkg}`)) {
      console.log(`❌ 缺少套件: ${pkg}`);
      allPackagesExist = false;
      allChecksPass = false;
    }
  }

  if (allPackagesExist) {
    console.log('✅ 關鍵套件都已安裝');
  }
} else {
  console.log('❌ node_modules 不存在');
  console.log('   請執行: npm install 或 yarn install');
  allChecksPass = false;
}
console.log('');

// 檢查 3: 設定檔
console.log('📋 檢查 3: 設定檔 (config.json)');
if (fs.existsSync('./config.json')) {
  console.log('✅ config.json 存在');

  try {
    const rawConfig = fs.readFileSync('./config.json', 'utf8');
    const config = JSON.parse(rawConfig);
    console.log('✅ config.json 格式正確（JSON 有效）');

    // 驗證設定內容
    const validation = validateConfig(config);
    if (validation.valid) {
      console.log('✅ 設定檔驗證通過');

      // 顯示設定摘要（隱藏密碼）
      console.log('');
      console.log('   設定摘要:');
      console.log(`   - 路由器 URL: ${config.url}`);
      console.log(`   - 路由器登入: ${config.login}`);
      console.log(`   - 路由器密碼: ${'*'.repeat(config.password?.length || 0)}`);

      if (config.api_listen_host && config.api_listen_port) {
        console.log(`   - API 監聽: ${config.api_listen_host}:${config.api_listen_port}`);
      }

      if (config.api_users) {
        const userCount = Object.keys(config.api_users).length;
        console.log(`   - API 使用者數量: ${userCount}`);
      }
    } else {
      console.log('❌ 設定檔驗證失敗:');
      validation.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
      allChecksPass = false;
    }
  } catch (error) {
    console.log('❌ config.json 格式錯誤:', error.message);
    allChecksPass = false;
  }
} else {
  console.log('❌ config.json 不存在');
  console.log('   請執行: cp config.example.json config.json');
  console.log('   然後編輯 config.json 填入您的路由器資訊');
  allChecksPass = false;
}
console.log('');

// 檢查 4: 程式檔案
console.log('📋 檢查 4: 程式檔案');
const requiredFiles = [
  'api-bridge.mjs',
  'sms-send.mjs',
  'sms-cat.mjs',
  'smtp-gateway.mjs',
  'src/routerClient.mjs',
  'src/validation.mjs',
  'src/constants.mjs'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!fs.existsSync(`./${file}`)) {
    console.log(`❌ 缺少檔案: ${file}`);
    allFilesExist = false;
    allChecksPass = false;
  }
}

if (allFilesExist) {
  console.log('✅ 所有必要檔案都存在');
}
console.log('');

// 檢查 5: 權限（僅限 Unix-like 系統）
if (process.platform !== 'win32') {
  console.log('📋 檢查 5: 檔案權限');

  if (fs.existsSync('./config.json')) {
    const stats = fs.statSync('./config.json');
    const mode = (stats.mode & parseInt('777', 8)).toString(8);

    if (mode === '600' || mode === '400') {
      console.log(`✅ config.json 權限正確 (${mode})`);
    } else {
      console.log(`⚠️  config.json 權限為 ${mode}`);
      console.log('   建議執行: chmod 600 config.json');
      console.log('   (保護設定檔中的密碼)');
    }
  }
  console.log('');
}

// 總結
console.log('='.repeat(60));
if (allChecksPass) {
  console.log('✅ 所有檢查都通過！');
  console.log('');
  console.log('下一步:');
  console.log('1. 測試發送 SMS:');
  console.log('   node sms-send.mjs "0912345678" "測試訊息"');
  console.log('');
  console.log('2. 啟動 API Bridge:');
  console.log('   node api-bridge.mjs');
  console.log('   然後開啟瀏覽器: http://127.0.0.1:3000');
  console.log('');
  console.log('3. 查看完整測試指南:');
  console.log('   cat docs/operations.md');
} else {
  console.log('❌ 有些檢查未通過，請修正上述問題');
  console.log('');
  console.log('常見解決方法:');
  console.log('- 安裝依賴: npm install 或 yarn install');
  console.log('- 建立設定: cp config.example.json config.json');
  console.log('- 編輯設定: nano config.json (或使用其他編輯器)');
  process.exit(1);
}
console.log('='.repeat(60));