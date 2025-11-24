require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/Pet');
const User = require('./models/User');
const axios = require('axios');

const GOV_API_BASE = 'https://data.moa.gov.tw/Service/OpenData/TransService.aspx';
const ANIMAL_UNIT_ID = 'QcbUEzN6E6DL';

async function importAnimals() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const admin = await User.findOne({ email: 'admin@petadoption.com' });
  if (!admin) {
    console.error('找不到管理員帳號');
    process.exit(1);
  }
  
  console.log('開始匯入動物資料...');
  
  const response = await axios.get(GOV_API_BASE, {
    params: { UnitId: ANIMAL_UNIT_ID, $top: 100 }
  });
  
  const animals = response.data;
  console.log(取得  筆資料);
  
  let imported = 0;
  let skipped = 0;
  
  for (const animal of animals) {
    try {
      const existing = await Pet.findOne({ 'govData.animalId': animal.animal_id });
      if (existing) {
        skipped++;
        continue;
      }
      
      const petData = {
        name: animal.animal_Variety || animal.animal_kind || '待命名',
        species: animal.animal_kind?.includes('狗') ? 'dog' : 
                 animal.animal_kind?.includes('貓') ? 'cat' : 'other',
        breed: animal.animal_Variety || '混種',
        gender: animal.animal_sex === 'M' ? 'male' : 
                animal.animal_sex === 'F' ? 'female' : 'unknown',
        age: { value: 2, unit: 'years' },
        ageCategory: 'adult',
        size: animal.animal_bodytype === 'SMALL' ? 'small' :
              animal.animal_bodytype === 'MEDIUM' ? 'medium' :
              animal.animal_bodytype === 'BIG' ? 'large' : 'medium',
        color: animal.animal_colour || '混色',
        description: ${animal.animal_caption || animal.animal_title || '可愛的毛孩等待認養'}\n\n收容所: \n地址: \n聯絡電話: ,
        location: animal.animal_place || animal.shelter_address || '台灣',
        adoptionStatus: animal.animal_status === '開放認養' ? 'available' : 'pending',
        personality: {
          traits: ['friendly', 'calm'],
          activityLevel: 'medium',
          goodWith: { children: 'unknown', otherPets: 'unknown', strangers: 'unknown' }
        },
        healthStatus: {
          vaccinated: animal.animal_sterilization === 'T',
          spayed: animal.animal_sterilization === 'T',
          microchipped: false
        },
        photos: animal.album_file ? [{ url: animal.album_file, isPrimary: true }] : [],
        createdBy: admin._id,
        govData: {
          animalId: animal.animal_id,
          subId: animal.animal_subid,
          areaCode: animal.animal_area_pkid,
          shelterCode: animal.animal_shelter_pkid,
          foundPlace: animal.animal_foundplace,
          foundDate: animal.animal_createtime,
          openDate: animal.animal_opendate,
          updateDate: animal.animal_update,
          closedDate: animal.animal_closeddate,
          shelterName: animal.shelter_name,
          shelterTel: animal.shelter_tel,
          shelterAddress: animal.shelter_address,
          title: animal.animal_title,
          caption: animal.animal_caption,
          remark: animal.animal_remark,
          originalData: animal
        }
      };
      
      await Pet.create(petData);
      imported++;
      
      if (imported % 10 === 0) {
        console.log(已匯入  隻...);
      }
    } catch (error) {
      console.error(匯入失敗:, error.message);
    }
  }
  
  console.log(\n匯入完成！);
  console.log(成功:  隻);
  console.log(略過:  隻);
  
  await mongoose.connection.close();
  process.exit(0);
}

importAnimals();
