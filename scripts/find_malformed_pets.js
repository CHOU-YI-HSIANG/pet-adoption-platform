require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const Pet = require('../backend/models/Pet');

async function main() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_adoption';
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to', mongoose.connection.name || 'database');

    // Conditions: missing age, missing photos array or empty, missing shelterInfo.intakeDate
    const conditions = [
      { $or: [ { age: { $exists: false } }, { age: null } ] },
      { $or: [ { photos: { $exists: false } }, { photos: { $size: 0 } } ] },
      { $or: [ { 'shelterInfo': { $exists: false } }, { 'shelterInfo.intakeDate': { $exists: false } }, { 'shelterInfo.intakeDate': null } ] }
    ];

    const malformed = await Pet.find({ $or: conditions }).select('_id name age photos shelterInfo').lean().limit(100);
    if (!malformed || malformed.length === 0) {
      console.log('No potentially malformed pets found (sample limit 100).');
    } else {
      console.log('Potentially malformed pets:');
      malformed.forEach(p => {
        console.log('- id:', p._id, 'name:', p.name || '(no name)');
        console.log('  age:', p.age);
        console.log('  photos:', Array.isArray(p.photos) ? p.photos.length : p.photos);
        console.log('  shelterInfo.intakeDate:', p.shelterInfo && p.shelterInfo.intakeDate);
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(2);
  }
}

main();
