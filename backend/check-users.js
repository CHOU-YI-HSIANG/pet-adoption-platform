require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_adoption';

mongoose.connect(uri)
  .then(async () => {
    console.log(' 已連接到資料庫\n');
    
    const totalUsers = await User.countDocuments();
    console.log(` 總用戶數: ${totalUsers}\n`);
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('username email firstName lastName createdAt isActive');
    
    console.log(' 最近註冊的用戶:');
    console.log(''.repeat(80));
    recentUsers.forEach((user, index) => {
      const date = new Date(user.createdAt).toLocaleString('zh-TW');
      const status = user.isActive ? '' : '';
      console.log(`${index + 1}. ${status} ${user.username} (${user.email})`);
      console.log(`   姓名: ${user.firstName} ${user.lastName}`);
      console.log(`   註冊時間: ${date}\n`);
    });
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error(' 資料庫連線失敗:', err.message);
    process.exit(1);
  });