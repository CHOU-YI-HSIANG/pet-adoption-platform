/**
 * Backfill script for Adoption documents:
 * - Ensure `personalInfo` exists (age, occupation) by pulling from possible legacy fields
 * - Ensure `carePlan` exists and populate fields from `motivation`, `applicantDetails`, and other fallbacks
 *
 * Usage: node backend/scripts/backfill_adoptions_personal_careplan.js
 */
const mongoose = require('mongoose');
const Adoption = require('../../models/Adoption');

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-adoption-platform';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for backfill');

  const cursor = Adoption.find({
    $or: [
      { personalInfo: { $exists: false } },
      { carePlan: { $exists: false } },
      { 'carePlan.dailyCareTime': { $exists: false } },
      { 'carePlan.adoptionReason': { $exists: false } }
    ]
  }).cursor();

  let processed = 0;
  let updated = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    processed++;
    let changed = false;

    // personalInfo
    if (!doc.personalInfo) {
      const age = doc.age ?? (doc.applicantDetails?.personalInfo?.age) ?? null;
      const occupation = doc.occupation ?? (doc.applicantDetails?.personalInfo?.occupation) ?? null;
      doc.personalInfo = { age: age !== undefined ? age : null, occupation: occupation || null };
      changed = true;
    }

    // carePlan
    if (!doc.carePlan) doc.carePlan = {};

    // adoptionReason <- motivation.reasons
    if (!doc.carePlan.adoptionReason) {
      const reasons = doc.motivation?.reasons;
      if (Array.isArray(reasons) && reasons.length > 0) {
        doc.carePlan.adoptionReason = reasons;
        changed = true;
      } else if (doc.motivation?.expectations) {
        doc.carePlan.adoptionReason = [doc.motivation.expectations];
        changed = true;
      }
    }

    // expectations / commitment
    if (!doc.carePlan.expectations && doc.motivation?.expectations) {
      doc.carePlan.expectations = doc.motivation.expectations;
      changed = true;
    }
    if (!doc.carePlan.commitment && doc.motivation?.commitment) {
      doc.carePlan.commitment = doc.motivation.commitment;
      changed = true;
    }

    // dailyCareTime <- applicantDetails.workSchedule.hoursAway
    if (!doc.carePlan.dailyCareTime) {
      const hoursAway = doc.applicantDetails?.workSchedule?.hoursAway;
      if (hoursAway !== undefined && hoursAway !== null) {
        // convert to readable string if numeric
        doc.carePlan.dailyCareTime = typeof hoursAway === 'number' ? `${hoursAway} 小時` : String(hoursAway);
        changed = true;
      }
    }

    // financialCapability <- existing field
    if (!doc.carePlan.financialCapability && (doc.financialCapability || doc.carePlan?.financialCapability)) {
      doc.carePlan.financialCapability = doc.financialCapability || doc.carePlan.financialCapability;
      changed = true;
    }

    // otherNotes <- additionalNotes
    if (!doc.carePlan.otherNotes && (doc.additionalNotes || doc.carePlan?.otherNotes)) {
      doc.carePlan.otherNotes = doc.additionalNotes || doc.carePlan.otherNotes;
      changed = true;
    }

    if (changed) {
      try {
        await doc.save();
        updated++;
      } catch (e) {
        console.error('Failed to save doc', doc._id, e);
      }
    }
  }

  console.log('Backfill complete. Processed=', processed, 'Updated=', updated);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Backfill failed', err);
  process.exit(1);
});
