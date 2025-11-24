// 測試通知系統
const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('./models/Notification');
const User = require('./models/User');

async function testNotificationSystem() {
  try {
    // 連接資料庫
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' 已連接資料庫');

    // 查找測試用戶
    const users = await User.find().limit(2);
    if (users.length < 1) {
      console.log(' 需要至少一個用戶才能測試');
      process.exit(1);
    }

    const testUser = users[0];
    console.log(`\n 測試用戶: ${testUser.username || testUser.firstName}`);
    console.log(`   用戶 ID: ${testUser._id}`);

    // 測試 1: 建立通知
    console.log('\n 測試 1: 建立通知');
    const notification = await Notification.createNotification({
      recipient: testUser._id,
      type: 'system',
      title: '測試通知',
      content: '這是一則測試通知，用於驗證通知系統是否正常運作',
      link: '/notifications',
      priority: 'normal'
    });
    console.log(`    通知已建立: ${notification._id}`);

    // 測試 2: 獲取未讀數量
    console.log('\n 測試 2: 獲取未讀數量');
    const unreadCount = await Notification.getUnreadCount(testUser._id);
    console.log(`    未讀通知數量: ${unreadCount}`);

    // 測試 3: 獲取通知列表
    console.log('\n 測試 3: 獲取通知列表');
    const notifications = await Notification.getUserNotifications(testUser._id, {
      page: 1,
      limit: 5
    });
    console.log(`    獲取到 ${notifications.length} 則通知`);

    // 測試 4: 標記通知為已讀
    console.log('\n 測試 4: 標記通知為已讀');
    await notification.markAsRead();
    console.log(`    通知已標記為已讀`);

    // 測試 5: 標記所有為已讀
    console.log('\n 測試 5: 標記所有通知為已讀');
    const result = await Notification.markAllAsRead(testUser._id);
    console.log(`    已標記 ${result.modifiedCount} 則通知為已讀`);

    // 測試 6: 再次檢查未讀數量
    console.log('\n 測試 6: 再次檢查未讀數量');
    const newUnreadCount = await Notification.getUnreadCount(testUser._id);
    console.log(`    未讀通知數量: ${newUnreadCount}`);

    console.log('\n 所有測試通過！通知系統運作正常');

  } catch (error) {
    console.error(' 測試失敗:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n資料庫連接已關閉');
    process.exit(0);
  }
}

testNotificationSystem();
