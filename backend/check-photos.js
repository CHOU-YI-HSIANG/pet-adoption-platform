require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/Pet');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const pet = await Pet.findOne({ 'govData.animalId': { $exists: true } })
    .select('name photos')
    .lean();
  
  console.log('寵物名稱:', pet.name);
  console.log('照片資料:', JSON.stringify(pet.photos, null, 2));
  
  await mongoose.connection.close();
  process.exit(0);
});
