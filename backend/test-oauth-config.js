/**
 * Google OAuth 配置測試
 * 執行: node test-oauth-config.js
 */

require('dotenv').config();

console.log('\n=== Google OAuth 配置驗證 ===\n');

const checks = [
  {
    name: 'GOOGLE_CLIENT_ID',
    value: process.env.GOOGLE_CLIENT_ID,
    required: true
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    value: process.env.GOOGLE_CLIENT_SECRET,
    required: true
  },
  {
    name: 'GOOGLE_CALLBACK_URL',
    value: process.env.GOOGLE_CALLBACK_URL,
    required: true
  },
  {
    name: 'JWT_SECRET',
    value: process.env.JWT_SECRET,
    required: true
  },
  {
    name: 'SESSION_SECRET',
    value: process.env.SESSION_SECRET,
    required: false
  }
];

let allPassed = true;

checks.forEach(check => {
  const status = check.value ? '✅' : (check.required ? '❌' : '⚠️');
  const statusText = check.value ? 'OK' : (check.required ? 'MISSING' : 'OPTIONAL');
  
  console.log(`${status} ${check.name}: ${statusText}`);
  
  if (check.value && check.name.includes('GOOGLE')) {
    const maskedValue = check.name === 'GOOGLE_CLIENT_ID' 
      ? check.value 
      : check.value.substring(0, 10) + '...' + check.value.substring(check.value.length - 4);
    console.log(`   值: ${maskedValue}`);
  }
  
  if (check.required && !check.value) {
    allPassed = false;
  }
  
  console.log('');
});

console.log('\n=== 可用的 API 端點 ===\n');
console.log('1. GET  /api/auth/google');
console.log('   描述: 啟動 Google OAuth 登入流程');
console.log('   使用: 前端重定向到此 URL\n');

console.log('2. GET  /api/auth/google/callback');
console.log('   描述: Google OAuth 回呼端點');
console.log('   使用: Google 授權後自動調用\n');

console.log('3. POST /api/auth/google/verify');
console.log('   描述: 驗證 Google One Tap token');
console.log('   Body: { "token": "google_id_token" }');
console.log('   使用: 前端使用 Google One Tap 取得 token 後呼叫\n');

if (allPassed) {
  console.log('✅ 所有必要的環境變數都已設定!\n');
  console.log('📝 下一步:');
  console.log('   1. 確認 Google Cloud Console 的授權重定向 URI:');
  console.log(`      ${process.env.GOOGLE_CALLBACK_URL}`);
  console.log('   2. 啟動伺服器: npm start');
  console.log('   3. 測試登入: 訪問 http://localhost:5000/api/auth/google\n');
} else {
  console.log('❌ 某些必要的環境變數未設定,請檢查 .env 檔案\n');
  process.exit(1);
}
