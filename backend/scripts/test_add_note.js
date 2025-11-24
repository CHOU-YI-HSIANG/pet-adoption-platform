// 測試腳本：在本地 DB 中找到一筆 pending/under-review 的 adoption，並以 pet.createdBy 或 admin 身分新增備註
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Adoption = require('../models/Adoption');
const User = require('../models/User');
// Ensure related models are registered with mongoose before populate
require('../models/Pet');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  // 找一筆 pending/under-review 的 adoption 並 populate pet
  const adoption = await Adoption.findOne({ status: { $in: ['pending', 'under-review'] } }).populate('pet');
  if (!adoption) {
    console.error('No pending/under-review adoption found');
    process.exit(1);
  }

  // 優先使用 pet.createdBy 為 reviewer，否則找 admin
  let reviewerId = null;
  if (adoption.pet && adoption.pet.createdBy) reviewerId = adoption.pet.createdBy;
  if (!reviewerId) {
    const admin = await User.findOne({ role: { $in: ['admin', 'shelter'] } });
    if (admin) reviewerId = admin._id;
  }
  if (!reviewerId) {
    console.error('No suitable reviewer user found');
    process.exit(1);
  }

  adoption.reviewNotes.push({ reviewer: reviewerId, note: '測試新增備註 (由自動化測試腳本)', createdAt: new Date() });
  await adoption.save();
  await adoption.populate('reviewNotes.reviewer', 'username role');

  console.log('Added note to adoption', adoption._id.toString());
  console.log('Latest reviewNotes:', adoption.reviewNotes.slice(-3));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
