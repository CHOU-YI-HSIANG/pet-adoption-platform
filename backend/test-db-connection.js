/**
 * 資料庫連接測試工具
 * 用於測試 MongoDB Atlas 連接是否正常
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('='.repeat(60));
console.log('  MongoDB 連接測試工具');
console.log('='.repeat(60));
console.log('');

// 顯示連接資訊（隱藏密碼）
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_adoption';
const safeUri = uri.replace(/:([^:@]{2})[^:@]*@/, ':$1***@');
console.log('連接字串:', safeUri);
console.log('');

// 連接選項
const options = {
  serverSelectionTimeoutMS: 10000, // 10秒超時
  socketTimeoutMS: 45000,
  family: 4 // 使用 IPv4
};

console.log('正在連接...');
console.log('');

mongoose.connect(uri, options)
  .then(async () => {
    console.log(' 連接成功！');
    console.log('');
    console.log('資料庫資訊:');
    console.log('  名稱:', mongoose.connection.name);
    console.log('  主機:', mongoose.connection.host);
    console.log('  狀態:', mongoose.connection.readyState === 1 ? '已連接' : '未連接');
    console.log('');
    
    // 測試寫入權限
    console.log('測試寫入權限...');
    const testCollection = mongoose.connection.db.collection('connection_test');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: '連接測試成功'
    });
    console.log(' 寫入權限正常');
    
    // 清理測試資料
    await testCollection.deleteOne({ test: true });
    console.log(' 刪除權限正常');
    
    console.log('');
    console.log('='.repeat(60));
    console.log('  所有測試通過！資料庫連接正常');
    console.log('='.repeat(60));
    
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    console.log(' 連接失敗！');
    console.log('');
    console.log('錯誤資訊:');
    console.log('  類型:', error.name);
    console.log('  訊息:', error.message);
    if (error.code) {
      console.log('  代碼:', error.code);
    }
    console.log('');
    console.log('可能的原因:');
    console.log('  1. 網路連線問題');
    console.log('  2. MongoDB Atlas IP 白名單未包含您的 IP');
    console.log('  3. 用戶名或密碼錯誤');
    console.log('  4. 資料庫名稱錯誤');
    console.log('  5. 連接字串格式錯誤');
    console.log('');
    console.log('解決方法:');
    console.log('  1. 檢查網路連線');
    console.log('  2. 登入 MongoDB Atlas 確認 IP 白名單設定');
    console.log('     - 可以暫時設定為 0.0.0.0/0 (允許所有 IP)');
    console.log('  3. 確認 .env 中的 MONGODB_URI 正確');
    console.log('  4. 確認密碼中的特殊字符已 URL 編碼');
    console.log('');
    console.log('='.repeat(60));
    
    process.exit(1);
  });
