const mongoose = require('mongoose');
const Pet = require('./models/Pet');
const User = require('./models/User');
require('dotenv').config();

async function viewData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' 已連接到 MongoDB\n');
    
    console.log('===  寵物列表 ===');
    const pets = await Pet.find({}).select('name species breed age.value gender adoptionStatus');
    pets.forEach((pet, index) => {
      const genderText = pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知';
      console.log(${index + 1}.  -  (, 歲, ) - );
    });
    
    console.log(\n總共:  隻寵物\n);
    
    console.log('===  使用者列表 ===');
    const users = await User.find({}).select('username email role isActive');
    users.forEach((user, index) => {
      console.log(${index + 1}.  () - 角色:  - );
    });
    
    console.log(\n總共:  位使用者\n);
    
    console.log('===  統計資訊 ===');
    const dogCount = await Pet.countDocuments({ species: 'dog' });
    const catCount = await Pet.countDocuments({ species: 'cat' });
    const availableCount = await Pet.countDocuments({ adoptionStatus: 'available' });
    
    console.log(狗:  隻);
    console.log(貓:  隻);
    console.log(可認養:  隻\n);
    
  } catch (error) {
    console.error(' 錯誤:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log(' 資料庫連接已關閉');
  }
}

viewData();
