require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Adoption = require('../models/Adoption');
const Notification = require('../models/Notification');
const Pet = require('../models/Pet');
const User = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  // 取最近 200 筆申請，或根據需要調整
  const recent = await Adoption.find().sort({ createdAt: -1 }).limit(200).lean();
  console.log(`Found ${recent.length} recent adoptions`);

  let createdCount = 0;

  for (const a of recent) {
    try {
      const already = await Notification.findOne({ relatedAdoption: a._id }).lean();
      if (already) {
        console.log(`Adoption ${a._id} already has notification ${already._id}, skipping`);
        continue;
      }

      const pet = await Pet.findById(a.pet).populate('createdBy', '_id username role').lean();
      if (!pet) {
        console.warn(`Pet ${a.pet} not found for adoption ${a._id}, skipping`);
        continue;
      }

      const petName = pet.name || '寵物';

      // 發給 pet.createdBy（若存在）
      if (pet.createdBy && pet.createdBy._id) {
        const recipientId = pet.createdBy._id;
        const content = `有人想認養您發布的 ${petName}！請前往查看申請詳情。`;
        // 直接在 DB 建立通知紀錄（避免在 script 中 require server 導致 server 重複啟動）
        const notif = await Notification.create({
          recipient: recipientId,
          type: 'adoption_received',
          title: '收到新的認養申請',
          content,
          link: `/adoptions/${a._id}`,
          relatedAdoption: a._id
        });
        console.log(`Created notification ${notif._id} -> recipient ${recipientId} for adoption ${a._id}`);
        createdCount++;

        // 如果 createdBy 是 admin，廣播給 shelter 的使用者（避免匯入寵物沒人處理）
        if (!pet.createdBy.role || pet.createdBy.role === 'admin') {
          const shelterUsers = await User.find({ role: 'shelter', isActive: true }).select('_id').lean();
          for (const s of shelterUsers) {
            // 再次檢查是否已為此 recipient 建立 (避免重複)
            const exists = await Notification.findOne({ relatedAdoption: a._id, recipient: s._id }).lean();
            if (exists) continue;
            // 直接建立 DB 紀錄，不做即時推送
            const snotif = await Notification.create({
              recipient: s._id,
              type: 'adoption_received',
              title: '收到新的認養申請',
              content: `有人想認養 ${petName}（透過資料匯入的寵物），請前往查看申請詳情。`,
              link: `/adoptions/${a._id}`,
              relatedAdoption: a._id
            });
            console.log(`  Broadcast created notification ${snotif._id} -> shelter ${s._id}`);
            createdCount++;
          }
        }

      } else {
        // 若沒有 createdBy，廣播給收容所帳號
        const shelterUsers = await User.find({ role: 'shelter', isActive: true }).select('_id').lean();
        for (const s of shelterUsers) {
          const exists = await Notification.findOne({ relatedAdoption: a._id, recipient: s._id }).lean();
          if (exists) continue;
          const snotif = await Notification.create({
            recipient: s._id,
            type: 'adoption_received',
            title: '收到新的認養申請',
            content: `有人想認養 ${petName}（此寵物沒有指定送養者），請前往查看申請詳情。`,
            link: `/adoptions/${a._id}`,
            relatedAdoption: a._id
          });
          console.log(`Broadcast created notification ${snotif._id} -> shelter ${s._id}`);
          createdCount++;
        }
      }

    } catch (e) {
      console.error(`Error processing adoption ${a._id}:`, e);
    }
  }

  console.log(`Finished. Created ${createdCount} notifications.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
