const mongoose = require('mongoose');
require('dotenv').config();

// 使用完整的 User model
const User = require('./models/User');

// 連接資料庫
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createAdmin() {
  try {
    console.log(' 檢查是否已有管理員帳號...');
    
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: 'admin@petadoption.com' },
        { username: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('  管理員帳號已存在！');
      console.log(' Email:', existingAdmin.email);
      process.exit(0);
    }

    console.log(' 建立新管理員帳號...');

    const admin = new User({
      username: 'admin',
      email: 'admin@petadoption.com',
      password: 'admin123456',
      firstName: '系統',
      lastName: '管理員',
      role: 'admin',
      phone: '0912345678',
      address: {
        city: '臺北市',
        district: '信義區',
        street: '市府路1號',
        zipCode: '110'
      }
    });

    await admin.save();

    console.log(' 管理員帳號建立成功！');
    console.log(' Email: admin@petadoption.com');
    console.log(' 密碼: admin123456');

    process.exit(0);
  } catch (error) {
    console.error(' 建立管理員失敗:', error);
    process.exit(1);
  }
}

mongoose.connection.once('open', createAdmin);
