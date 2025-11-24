require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/Pet');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('連接到資料庫');
  
  const totalPets = await Pet.countDocuments();
  console.log('總寵物數:', totalPets);
  
  const govPets = await Pet.countDocuments({ 'govData.animalId': { $exists: true } });
  console.log('政府資料寵物數:', govPets);
  
  const availablePets = await Pet.countDocuments({ adoptionStatus: 'available', isActive: true });
  console.log('可認養寵物數:', availablePets);
  
  const availableGovPets = await Pet.countDocuments({ 
    'govData.animalId': { $exists: true },
    adoptionStatus: 'available',
    isActive: true
  });
  console.log('政府資料中可認養數:', availableGovPets);
  
  await mongoose.connection.close();
  process.exit(0);
});
