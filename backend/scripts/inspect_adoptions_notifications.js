// 檢查：印出最近 creation 的 adoption 與相關 notification
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Adoption = require('../models/Adoption');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Pet = require('../models/Pet');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  // 取最新 5 筆 adoption
  const recent = await Adoption.find().sort({ createdAt: -1 }).limit(5).populate('pet').populate('applicant', 'username email').lean();
  console.log('=== Recent Adoptions ===');
  recent.forEach(a => {
    console.log('ID:', a._id.toString());
    console.log('  pet:', a.pet?._id?.toString(), a.pet?.name, 'createdBy:', a.pet?.createdBy);
    console.log('  applicant:', a.applicant?.username, a.applicant?._id);
    console.log('  status:', a.status, 'createdAt:', a.createdAt);
    console.log('  related reviewNotes count:', (a.reviewNotes || []).length);
    console.log('---');
  });

  const target = recent[0];
  if (!target) {
    console.log('No recent adoption found');
    process.exit(0);
  }

  // 找出與該 adoption 有關的通知
  const notifs = await Notification.find({ relatedAdoption: target._id }).sort({ createdAt: -1 }).lean();
  console.log('\n=== Notifications for adoption', target._id.toString(), '===');
  if (notifs.length === 0) {
    console.log('No notifications found for this adoption.');
  } else {
    notifs.forEach(n => {
      console.log('notif id:', n._id.toString());
      console.log('  recipient:', n.recipient && n.recipient.toString());
      console.log('  type:', n.type, 'title:', n.title, 'createdAt:', n.createdAt);
      console.log('  link:', n.link);
      console.log('  isRead:', n.isRead);
      console.log('---');
    });
  }

  // 列出所有 admin 與 shelter users
  const admins = await User.find({ role: 'admin' }).select('_id username email').lean();
  const shelters = await User.find({ role: 'shelter' }).select('_id username email').lean();
  console.log('\n=== Admin users ===');
  admins.forEach(u => console.log(u._id.toString(), u.username || u.email));
  console.log('\n=== Shelter users ===');
  shelters.forEach(u => console.log(u._id.toString(), u.username || u.email));

  // 如果 pet.createdBy 指向一個 admin id，嘗試印出該 user
  const pet = await Pet.findById(target.pet._id).lean();
  console.log('\nPet document:', pet?._id?.toString(), 'createdBy:', pet?.createdBy);
  if (pet && pet.createdBy) {
    const owner = await User.findById(pet.createdBy).select('_id username role email').lean();
    console.log('Pet owner user doc:', owner);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
