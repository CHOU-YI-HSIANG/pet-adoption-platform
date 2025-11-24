require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/Pet');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const admin = await User.findOne({ email: 'admin@petadoption.com' });
  console.log('Admin ID:', admin._id);
  
  const totalPets = await Pet.countDocuments({ isActive: true });
  console.log('總寵物數 (isActive=true):', totalPets);
  
  const adminPets = await Pet.countDocuments({ createdBy: admin._id, isActive: true });
  console.log('Admin 建立的寵物:', adminPets);
  
  const availablePets = await Pet.countDocuments({ adoptionStatus: 'available', isActive: true });
  console.log('可認養寵物 (available):', availablePets);
  
  await mongoose.connection.close();
  process.exit(0);
});
