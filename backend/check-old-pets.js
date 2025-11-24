require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/Pet');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('檢查前 8 筆寵物...');
  
  const pets = await Pet.find({ 'govData.animalId': { $exists: false } })
    .limit(8)
    .select('name species breed age ageCategory tags personality healthStatus')
    .lean();
  
  pets.forEach((pet, index) => {
    console.log(\n=== 寵物 :  ===);
    console.log('品種:', pet.breed);
    console.log('年齡:', pet.age);
    console.log('年齡類別:', pet.ageCategory || '未設定');
    console.log('標籤:', pet.tags || []);
    console.log('個性特質:', pet.personality?.traits || []);
    console.log('活動力:', pet.personality?.activityLevel || '未設定');
    console.log('健康:', {
      vaccinated: pet.healthStatus?.vaccinated || false,
      spayed: pet.healthStatus?.spayed || false
    });
  });
  
  await mongoose.connection.close();
  process.exit(0);
});
