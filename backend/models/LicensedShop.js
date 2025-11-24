const mongoose = require('mongoose');
const { Schema } = mongoose;

const LicensedShopSchema = new Schema({
  govId: { type: String, required: true, unique: true },
  legalType: String,
  name: { type: String, required: true },
  address: String,
  businessItem: String,
  animalType: String,
  validNumber: String,
  validDate: Date,
  ownerName: String,
  bossName: String,
  rankYear: String,
  rankCode: String,
  rankFlags: [String],
  rankText: String,
  stateFlag: String,
  originalData: Schema.Types.Mixed,
  importedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.LicensedShop || mongoose.model('LicensedShop', LicensedShopSchema);
