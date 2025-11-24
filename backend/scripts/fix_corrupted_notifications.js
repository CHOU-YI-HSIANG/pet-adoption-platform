require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Pet = require('../models/Pet');

function looksCorrupted(s) {
  if (!s || typeof s !== 'string') return true;
  const qm = (s.match(/\?/g) || []).length;
  if (qm >= 4) return true;
  if (s.trim().length === 0) return true;
  return false;
}

function fallbackFor(notification, petName) {
  const type = notification.type || 'system';
  switch (type) {
    case 'adoption_received':
      return {
        title: '收到新的認養申請',
        content: petName ? `有人想認養您發布的 ${petName}，請前往查看申請詳情。` : '有人提交了認養申請，請前往查看詳情。'
      };
    case 'adoption_approved':
      return { title: '認養申請已核准', content: petName ? `${petName} 的申請已核准` : '您的認養申請已核准' };
    case 'adoption_rejected':
      return { title: '認養申請未通過', content: petName ? `${petName} 的申請未通過` : '您的認養申請未通過' };
    default:
      return { title: notification.title || '通知', content: notification.content || '' };
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  // 找出可能被污染的通知（採用程式端檢測更可靠）
  const notifications = await Notification.find().sort({ createdAt: -1 }).limit(1000).lean();
  console.log(`Loaded ${notifications.length} recent notifications to inspect`);

  let fixed = 0;

  for (const n of notifications) {
    const titleCorrupt = looksCorrupted(n.title);
    const contentCorrupt = looksCorrupted(n.content);
    if (!titleCorrupt && !contentCorrupt) continue;

    // 嘗試取得相關 pet 名稱
    let petName = '';
    if (n.relatedPet) {
      try {
        const pet = await Pet.findById(n.relatedPet).select('name').lean();
        if (pet && pet.name) petName = pet.name;
      } catch (e) {
        // ignore
      }
    }

    const fallback = fallbackFor(n, petName);

    try {
      const update = {};
      if (titleCorrupt) update.title = fallback.title;
      if (contentCorrupt) update.content = fallback.content;

      if (Object.keys(update).length > 0) {
        await Notification.updateOne({ _id: n._id }, { $set: update });
        console.log(`Fixed notification ${n._id} -> ${JSON.stringify(update)}`);
        fixed++;
      }
    } catch (e) {
      console.error(`Failed to update notification ${n._id}:`, e.message);
    }
  }

  console.log(`Done. Fixed ${fixed} notifications.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
