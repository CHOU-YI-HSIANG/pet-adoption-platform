require("dotenv").config();
const mongoose = require("mongoose");
const Pet = require("./models/Pet");

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const count = await Pet.countDocuments();
  const withGovData = await Pet.countDocuments({ "govData.animalId": { "$exists": true } });
  console.log("Total pets:", count);
  console.log("From gov:", withGovData);
  await mongoose.connection.close();
});
