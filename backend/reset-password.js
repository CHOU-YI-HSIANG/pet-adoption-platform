require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log(' 連接成功');
  
  const admin = await User.findOne({ email: 'admin@petadoption.com' });
  
  if (!admin) {
    console.log(' 帳號不存在');
    return process.exit(1);
  }
  
  console.log(' 找到帳號:', admin.email);
  
  // 直接更新哈希密碼
  const hashedPassword = await bcrypt.hash('admin123456', 12);
  await User.updateOne(
    { _id: admin._id },
    { `$set: { password: hashedPassword } }
  );
  
  console.log(' 密碼已重置');
  console.log('� 新哈希:', hashedPassword.substring(0, 30) + '...');
  
  await mongoose.connection.close();
  process.exit(0);
}).catch(err => {
  console.error(' 錯誤:', err.message);
  process.exit(1);
});
