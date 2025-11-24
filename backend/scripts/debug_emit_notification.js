require('dotenv').config();
// 這個 debug 腳本會啟動 server 並在 DB 中為第一個找到的 user 建立一筆測試通知
// 使用方式 (在專案根目錄):
// node backend/scripts/debug_emit_notification.js

const mongoose = require('mongoose');
const path = require('path');

async function main() {
  // 啟動 server (會同時建立 io 並 listen)
  console.log('Requiring server (this will start the server)');
  const app = require('../server');

  // 等待 mongoose 連線
  const { connection } = mongoose;
  if (connection.readyState !== 1) {
    console.log('Waiting for mongoose to connect...');
    await new Promise((resolve) => {
      const onConnected = () => {
        resolve();
      };
      mongoose.connection.once('connected', onConnected);
      // 若已連上則立即 resolve
      if (mongoose.connection.readyState === 1) resolve();
    });
  }

  const User = require('../models/User');
  const Notification = require('../models/Notification');

  const user = await User.findOne().lean();
  if (!user) {
    console.error('No user found in DB to act as recipient.');
    process.exit(1);
  }

  console.log('Creating test notification for user', user._id);
  try {
    const n = await Notification.createNotification({
      recipient: user._id,
      sender: null,
      type: 'system',
      title: '測試通知 (debug)',
      content: '這是系統測試通知，若看到此訊息代表 Notification.createNotification 可執行。',
      metadata: { debug: true }
    });
    console.log('Created notification:', n._id.toString());
  } catch (e) {
    console.error('Failed to create notification', e && e.message);
  } finally {
    // 等一小段時間讓任何 emit 被執行，然後結束程式
    setTimeout(() => process.exit(0), 1200);
  }
}

main().catch(err => {
  console.error('Debug script failed', err && err.message);
  process.exit(1);
});
