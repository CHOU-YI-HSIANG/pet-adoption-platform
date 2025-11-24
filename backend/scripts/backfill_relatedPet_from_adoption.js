require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
// 先載入 Pet model，確保 populate('pet') 時 schema 已註冊
const Pet = require('../models/Pet');
const Adoption = require('../models/Adoption');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB for backfill');

  const query = {
    relatedAdoption: { $exists: true, $ne: null },
    $or: [ { relatedPet: { $exists: false } }, { relatedPet: null } ]
  };

  const cursor = Notification.find(query).cursor();
  let processed = 0;
  let updated = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    processed++;
    try {
      const adoptionId = doc.relatedAdoption || (doc.metadata && doc.metadata.relatedAdoption);
      if (!adoptionId) continue;
      const adoption = await Adoption.findById(adoptionId).populate('pet', '_id name');
      if (adoption && adoption.pet) {
        doc.relatedPet = adoption.pet._id;
        await doc.save();
        updated++;
        console.log(`Updated notification ${doc._id} -> relatedPet ${adoption.pet._id} (${adoption.pet.name || 'n/a'})`);
      }
    } catch (e) {
      console.error('Failed processing notification', doc._id, e && e.message);
    }
  }

  console.log(`Backfill complete. Processed=${processed}, Updated=${updated}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
