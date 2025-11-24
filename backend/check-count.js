require("dotenv").config();
const mongoose = require("mongoose");
const Pet = require("./models/Pet");

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const total = await Pet.countDocuments();
  const withGovData = await Pet.countDocuments({ "govData.animalId": { "$exists": true } });
  const active = await Pet.countDocuments({ isActive: true });
  
  console.log("總寵物數:", total);
  console.log("政府資料:", withGovData);
  console.log("可領養:", active);
  
  await mongoose.connection.close();
});
