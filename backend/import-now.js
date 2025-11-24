require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/Pet');
const User = require('./models/User');
const axios = require('axios');

async function importData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const admin = await User.findOne({ email: 'admin@petadoption.com' });
    console.log('Admin ID:', admin._id.toString());
    
    const response = await axios.get('https://data.moa.gov.tw/Service/OpenData/TransService.aspx', {
      params: { UnitId: 'QcbUEzN6E6DL', '$top': 100 }
    });
    
    console.log('Got', response.data.length, 'records');
    
    let imported = 0;
    let skipped = 0;
    
    for (const animal of response.data) {
      try {
        const existing = await Pet.findOne({ 'govData.animalId': animal.animal_id });
        if (existing) {
          skipped++;
          continue;
        }
        
        await Pet.create({
          name: animal.animal_Variety || 'Pet',
          species: animal.animal_kind && animal.animal_kind.includes('Dog') ? 'dog' : 'cat',
          breed: animal.animal_Variety || 'Mixed',
          gender: animal.animal_sex === 'M' ? 'male' : animal.animal_sex === 'F' ? 'female' : 'unknown',
          age: { value: 2, unit: 'years' },
          ageCategory: 'adult',
          size: 'medium',
          color: animal.animal_colour || 'mixed',
          description: animal.animal_caption || 'Lovely pet waiting for adoption',
          location: animal.shelter_address || 'Taiwan',
          adoptionStatus: 'available',
          personality: {
            traits: ['friendly'],
            activityLevel: 'medium',
            goodWith: {}
          },
          healthStatus: {},
          photos: animal.album_file ? [{ url: animal.album_file, isPrimary: true }] : [],
          createdBy: admin._id,
          govData: {
            animalId: animal.animal_id,
            shelterName: animal.shelter_name,
            originalData: animal
          }
        });
        
        imported++;
        if (imported % 10 === 0) console.log('Imported', imported);
      } catch (err) {
        console.error('Error importing:', err.message);
      }
    }
    
    console.log('Done! Imported:', imported, 'Skipped:', skipped);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

importData();