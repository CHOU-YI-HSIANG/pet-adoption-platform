require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('連接成功');
  
  await User.deleteOne({ email: 'admin@petadoption.com' });
  
  const admin = new User({
    username: 'admin',
    email: 'admin@petadoption.com',
    password: 'Admin123456',
    name: '系統管理員',
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
  
  console.log('建立成功！');
  console.log('Email: admin@petadoption.com');
  console.log('密碼: Admin123456');
  console.log('角色:', admin.role);
  
  await mongoose.connection.close();
}).catch(err => {
  console.error('錯誤:', err.message);
  process.exit(1);
});
