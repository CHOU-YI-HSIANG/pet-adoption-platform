require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const notif = await Notification.createNotification({
    recipient: '69142acaf78c1cb168032d92',
    type: 'adoption_received',
    title: '測試通知 (create_test_notification)',
    content: '這是一則測試通知 (請忽略)',
    link: '/my-pets-applications',
    relatedAdoption: '69182d1cffceb375e6e3ff0d'
  });

  console.log('Created notification:', notif._id.toString());
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
