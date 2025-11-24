require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Pet = require('./models/Pet');
const User = require('./models/User');

// 連接資料庫
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log(' 已連接到資料庫');
  
  try {
    // 找到 admin 使用者
    const admin = await User.findOne({ email: 'admin@petadoption.com' });
    if (!admin) {
      console.log(' 找不到 admin 帳號');
      process.exit(1);
    }
    
    console.log(' 開始獲取政府資料...');
    
    // 獲取 100 筆動物資料
    const response = await axios.get('https://data.moa.gov.tw/Service/OpenData/TransService.aspx', {
      params: { UnitId: 'QcbUEzN6E6DL', '$top': 100 },
      timeout: 60000
    });
    
    const animals = response.data;
    console.log('獲取到', animals.length, '筆動物資料');
    
    let imported = 0, skipped = 0, failed = 0;
    
    for (const animal of animals) {
      try {
        // 檢查是否已存在
        const exists = await Pet.findOne({ 'govData.animalId': animal.animal_subid });
        if (exists) {
          skipped++;
          continue;
        }
        
        // 映射資料
        const ageValue = animal.animal_age === 'CHILD' ? 1 : animal.animal_age === 'ADULT' ? 3 : 7;
        const description = '🏠 收容編號: ' + (animal.animal_subid || animal.animal_id) + 
          '\n📍 收容所: ' + (animal.shelter_name || '未提供') + 
          '\n📞 電話: ' + (animal.shelter_tel || '未提供') +
          '\n🗺️ 地址: ' + (animal.shelter_address || '未提供') +
          '\n📅 開放時間: ' + (animal.animal_opendate || '請洽收容所') +
          '\n🔍 尋獲地: ' + (animal.animal_foundplace || '未提供') +
          '\n💬 備註: ' + (animal.animal_remark || '無') +
          '\n\n此動物資料來自政府開放資料平台，如需認養請聯繫上述收容所。';
        
        const petData = {
          name: animal.animal_Variety || animal.animal_subid || '待命名',
          species: animal.animal_kind === '狗' ? 'dog' : animal.animal_kind === '貓' ? 'cat' : 'other',
          breed: animal.animal_Variety || animal.animal_kind || '混種',
          age: {
            value: ageValue,
            unit: 'years'
          },
          ageCategory: animal.animal_age === 'CHILD' ? 'young' : animal.animal_age === 'ADULT' ? 'adult' : 'senior',
          gender: animal.animal_sex === 'M' ? 'male' : animal.animal_sex === 'F' ? 'female' : 'unknown',
          size: animal.animal_bodytype === 'SMALL' ? 'small' : animal.animal_bodytype === 'BIG' ? 'large' : 'medium',
          color: animal.animal_colour || '未知',
          description: description,
          adoptionStatus: animal.animal_status === 'OPEN' ? 'available' : 'not-available',
          photos: animal.album_file ? [{
            url: animal.album_file,
            filename: animal.animal_subid + '.jpg',
            isPrimary: true
          }] : [],
          healthStatus: { 
            vaccinated: true, 
            spayed: animal.animal_sterilization === 'T',
            microchipped: false,
            healthConditions: []
          },
          personality: {
            traits: [],
            goodWith: {},
            activityLevel: 'moderate',
            specialNeeds: []
          },
          shelterInfo: {
            intakeDate: new Date(animal.animal_createtime || Date.now()),
            source: 'stray',
            location: animal.shelter_name || '政府開放資料',
            kennel: animal.animal_subid || animal.animal_id.toString()
          },
          createdBy: admin._id,
          govData: {
            animalId: animal.animal_subid || animal.animal_id.toString(),
            subId: animal.animal_subid,
            shelterName: animal.shelter_name,
            shelterTel: animal.shelter_tel,
            shelterAddress: animal.shelter_address,
            originalData: animal
          }
        };
        
        await Pet.create(petData);
        imported++;
        if (imported % 10 === 0) console.log('已匯入', imported, '筆...');
        
      } catch (error) {
        failed++;
        console.error('匯入失敗:', error.message);
      }
    }
    
    console.log('\n 匯入完成！');
    console.log('成功:', imported, '筆');
    console.log('跳過:', skipped, '筆');
    console.log('失敗:', failed, '筆');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error(' 錯誤:', error.message);
    process.exit(1);
  }
});
