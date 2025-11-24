require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/Pet');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('連接到資料庫');
  const result = await Pet.deleteMany({ 'govData.animalId': { $exists: true } });
  console.log('已刪除', result.deletedCount, '筆政府資料');
  await mongoose.connection.close();
  process.exit(0);
});
