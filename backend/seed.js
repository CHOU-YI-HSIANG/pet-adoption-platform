const mongoose = require('mongoose');
const Pet = require('./models/Pet');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 連接資料庫
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' 已連接到 MongoDB');
  } catch (error) {
    console.error(' MongoDB 連接失敗:', error);
    process.exit(1);
  }
}

// 建立測試收容所帳號
async function createShelterAccount() {
  try {
    const existingShelter = await User.findOne({ email: 'shelter@example.com' });
    
    if (existingShelter) {
      console.log(' 使用現有收容所帳號');
      return existingShelter;
    }
    
    const shelter = new User({
      username: 'lovepets_shelter',
      name: '愛心收容所',
      email: 'shelter@example.com',
      password: 'shelter123',
      firstName: '愛心',
      lastName: '收容所',
      role: 'shelter',
      phone: '02-12345678',
      address: {
        city: '台北市',
        district: '大安區',
        street: '愛心路100號'
      },
      isActive: true,
      is_verified: true
    });
    
    await shelter.save();
    console.log(' 收容所帳號已建立');
    console.log('   Email: shelter@example.com');
    console.log('   Password: shelter123');
    return shelter;
  } catch (error) {
    console.error(' 建立收容所帳號失敗:', error.message);
    throw error;
  }
}

// 示範寵物資料 (符合 Pet 模型)
const createPets = (shelterId) => [
  {
    name: '小白',
    species: 'dog',
    breed: '拉布拉多',
    gender: 'male',
    age: { value: 2, unit: 'years' },
    ageCategory: 'adult',
    size: 'large',
    weight: 30,
    color: '白色',
    healthStatus: {
      vaccinated: true,
      spayed: true,
      microchipped: true
    },
    personality: {
      traits: ['friendly', 'playful', 'energetic'],
      goodWith: {
        children: true,
        otherPets: true,
        strangers: true
      },
      activityLevel: 'high'
    },
    photos: [{
      url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600',
      filename: 'labrador-white.jpg',
      isPrimary: true,
      caption: '活潑可愛的小白'
    }],
    shelterInfo: {
      intakeDate: new Date('2024-01-15'),
      source: 'stray',
      location: '台北市愛心收容所',
      kennel: 'A101'
    },
    adoptionStatus: 'available',
    adoptionFee: 2000,
    description: '小白是一隻非常親人的拉布拉多犬,個性溫和友善,喜歡玩耍和游泳。已完成基本訓練,聽得懂簡單指令。非常適合有院子的家庭飼養,是陪伴孩子成長的好夥伴。',
    story: '小白是在公園被發現的流浪狗,當時瘦弱但眼神溫柔。經過悉心照料已恢復健康,現在正在尋找一個永遠的家。',
    createdBy: shelterId,
    featured: true
  },
  {
    name: '橘子',
    species: 'cat',
    breed: '橘貓',
    gender: 'female',
    age: { value: 1, unit: 'years' },
    ageCategory: 'young',
    size: 'medium',
    weight: 4.5,
    color: '橘色',
    healthStatus: {
      vaccinated: true,
      spayed: true,
      microchipped: true
    },
    personality: {
      traits: ['gentle', 'calm', 'independent'],
      goodWith: {
        children: true,
        otherPets: true,
        strangers: false
      },
      activityLevel: 'moderate'
    },
    photos: [{
      url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600',
      filename: 'orange-cat.jpg',
      isPrimary: true,
      caption: '溫柔的橘子'
    }],
    shelterInfo: {
      intakeDate: new Date('2024-02-20'),
      source: 'owner-surrender',
      location: '台北市愛心收容所',
      kennel: 'C201'
    },
    adoptionStatus: 'available',
    adoptionFee: 1500,
    description: '橘子是一隻可愛的橘貓,個性溫和安靜,非常適合公寓飼養。她喜歡在陽光下打盹,偶爾會撒嬌討摸摸。不挑食,很容易照顧,是理想的家庭寵物。',
    createdBy: shelterId,
    featured: true
  },
  {
    name: '小黑',
    species: 'dog',
    breed: '台灣土狗',
    gender: 'male',
    age: { value: 3, unit: 'years' },
    ageCategory: 'adult',
    size: 'medium',
    weight: 20,
    color: '黑色',
    healthStatus: {
      vaccinated: true,
      spayed: true,
      microchipped: true
    },
    personality: {
      traits: ['loyal', 'protective', 'social'],
      goodWith: {
        children: true,
        otherPets: false,
        strangers: false
      },
      activityLevel: 'high'
    },
    photos: [{
      url: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600',
      filename: 'black-dog.jpg',
      isPrimary: true,
      caption: '忠心的小黑'
    }],
    shelterInfo: {
      intakeDate: new Date('2023-11-10'),
      source: 'stray',
      location: '新北市動物之家',
      kennel: 'B105'
    },
    adoptionStatus: 'available',
    adoptionFee: 1000,
    description: '小黑是一隻忠心耿耿的台灣土狗,個性警覺聰明,已經過基本服從訓練。對主人非常忠誠,適合需要看家護院的家庭。建議有養狗經驗的飼主認養。',
    createdBy: shelterId
  },
  {
    name: '花花',
    species: 'cat',
    breed: '三花貓',
    gender: 'female',
    age: { value: 4, unit: 'years' },
    ageCategory: 'adult',
    size: 'small',
    weight: 3.8,
    color: '三花(黑白橘)',
    healthStatus: {
      vaccinated: true,
      spayed: true,
      microchipped: true
    },
    personality: {
      traits: ['independent', 'gentle', 'quiet'],
      goodWith: {
        children: false,
        otherPets: false,
        strangers: false
      },
      activityLevel: 'low'
    },
    photos: [{
      url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
      filename: 'calico-cat.jpg',
      isPrimary: true,
      caption: '優雅的花花'
    }],
    shelterInfo: {
      intakeDate: new Date('2023-09-05'),
      source: 'owner-surrender',
      location: '台中市動物之家',
      kennel: 'C305'
    },
    adoptionStatus: 'available',
    adoptionFee: 1200,
    description: '花花是一隻優雅的三花貓,個性獨立安靜,喜歡自己的空間。適合單身或喜歡安靜環境的家庭。她不太親人但也不會攻擊,只是需要時間慢慢熟悉新環境。',
    createdBy: shelterId
  },
  {
    name: '金金',
    species: 'dog',
    breed: '黃金獵犬',
    gender: 'female',
    age: { value: 5, unit: 'years' },
    ageCategory: 'adult',
    size: 'large',
    weight: 28,
    color: '金黃色',
    healthStatus: {
      vaccinated: true,
      spayed: true,
      microchipped: true,
      healthConditions: [{
        condition: '輕微關節炎',
        description: '需要定期補充關節保健品',
        severity: 'mild'
      }]
    },
    personality: {
      traits: ['friendly', 'gentle', 'calm', 'loyal'],
      goodWith: {
        children: true,
        otherPets: true,
        strangers: true
      },
      activityLevel: 'moderate'
    },
    photos: [{
      url: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=600',
      filename: 'golden-retriever.jpg',
      isPrimary: true,
      caption: '溫柔的金金'
    }],
    shelterInfo: {
      intakeDate: new Date('2024-01-20'),
      source: 'owner-surrender',
      location: '台北市愛心收容所',
      kennel: 'A102'
    },
    adoptionStatus: 'available',
    adoptionFee: 2500,
    description: '金金是一隻溫柔的黃金獵犬,個性穩定友善,非常適合有小孩的家庭。雖然有輕微關節炎但不影響日常生活,只需定期給予保健品即可。是非常棒的家庭伴侶犬。',
    createdBy: shelterId,
    featured: true
  },
  {
    name: '雪球',
    species: 'cat',
    breed: '波斯貓',
    gender: 'male',
    age: { value: 6, unit: 'months' },
    ageCategory: 'young',
    size: 'small',
    weight: 3.2,
    color: '純白',
    healthStatus: {
      vaccinated: true,
      spayed: false,
      microchipped: true
    },
    personality: {
      traits: ['playful', 'curious', 'social'],
      goodWith: {
        children: true,
        otherPets: true,
        strangers: true
      },
      activityLevel: 'high'
    },
    photos: [{
      url: 'https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=600',
      filename: 'white-persian-cat.jpg',
      isPrimary: true,
      caption: '可愛的雪球'
    }],
    shelterInfo: {
      intakeDate: new Date('2024-03-10'),
      source: 'born-in-shelter',
      location: '台北市愛心收容所',
      kennel: 'C202'
    },
    adoptionStatus: 'available',
    adoptionFee: 1800,
    description: '雪球是在收容所出生的波斯貓寶寶,個性活潑好奇,喜歡跟人玩耍。因為是幼貓所以還沒結紮,認養後請記得帶去結紮。毛色純白非常可愛,是很受歡迎的品種貓。',
    createdBy: shelterId,
    featured: true
  },
  {
    name: '阿福',
    species: 'dog',
    breed: '柴犬',
    gender: 'male',
    age: { value: 7, unit: 'years' },
    ageCategory: 'senior',
    size: 'medium',
    weight: 12,
    color: '赤色',
    healthStatus: {
      vaccinated: true,
      spayed: true,
      microchipped: true
    },
    personality: {
      traits: ['calm', 'independent', 'loyal'],
      goodWith: {
        children: true,
        otherPets: true,
        strangers: false
      },
      activityLevel: 'low'
    },
    photos: [{
      url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600',
      filename: 'shiba-inu.jpg',
      isPrimary: true,
      caption: '穩重的阿福'
    }],
    shelterInfo: {
      intakeDate: new Date('2024-02-01'),
      source: 'owner-surrender',
      location: '新北市動物之家',
      kennel: 'B108'
    },
    adoptionStatus: 'available',
    adoptionFee: 1500,
    description: '阿福是一隻穩重的柴犬,因為主人搬家無法繼續飼養而來到收容所。個性獨立但忠誠,已經過訓練,非常聽話。雖然年紀較大但身體健康,適合喜歡安靜伴侶的家庭。',
    createdBy: shelterId
  },
  {
    name: '咪咪',
    species: 'cat',
    breed: '美國短毛貓',
    gender: 'female',
    age: { value: 2, unit: 'years' },
    ageCategory: 'adult',
    size: 'medium',
    weight: 4.2,
    color: '銀色虎斑',
    healthStatus: {
      vaccinated: true,
      spayed: true,
      microchipped: true
    },
    personality: {
      traits: ['friendly', 'playful', 'social'],
      goodWith: {
        children: true,
        otherPets: true,
        strangers: true
      },
      activityLevel: 'moderate'
    },
    photos: [{
      url: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=600',
      filename: 'american-shorthair.jpg',
      isPrimary: true,
      caption: '親人的咪咪'
    }],
    shelterInfo: {
      intakeDate: new Date('2024-02-28'),
      source: 'transfer',
      location: '台北市愛心收容所',
      kennel: 'C203'
    },
    adoptionStatus: 'available',
    adoptionFee: 1600,
    description: '咪咪是一隻親人的美短貓,個性活潑友善,喜歡跟人互動。銀色虎斑花紋非常漂亮,是很受歡迎的品種。適應力強,很容易融入新家庭,是理想的家庭寵物。',
    createdBy: shelterId,
    featured: true
  }
];

// 執行資料載入
async function seedDatabase() {
  try {
    await connectDB();
    
    // 建立收容所帳號
    console.log('\n 建立示範收容所帳號...');
    const shelter = await createShelterAccount();
    
    // 清除現有寵物資料 (可選)
    if (process.argv.includes('--clear')) {
      await Pet.deleteMany({});
      console.log('  已清除現有寵物資料');
    }
    
    // 載入寵物資料
    console.log('\n 開始載入寵物資料...');
    const pets = createPets(shelter._id);
    
    for (const petData of pets) {
      try {
        // 檢查是否已存在
        const existingPet = await Pet.findOne({ name: petData.name });
        if (existingPet) {
          console.log(`  ${petData.name} 已存在,跳過`);
          continue;
        }
        
        const pet = new Pet(petData);
        await pet.save();
        console.log(` 已新增: ${petData.name} (${petData.breed})`);
      } catch (error) {
        console.error(` 載入 ${petData.name} 失敗:`, error.message);
      }
    }
    
    console.log('\n 成功載入寵物資料!');
    console.log(`\n測試帳號:`);
    console.log(`   收容所 Email: shelter@example.com`);
    console.log(`   密碼: shelter123\n`);
    
  } catch (error) {
    console.error(' 錯誤:', error);
  } finally {
    await mongoose.connection.close();
    console.log(' 資料庫連接已關閉');
  }
}

// 執行
seedDatabase();
