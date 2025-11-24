const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // 接收者
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 發送者（系統通知時可為空）
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 通知類型
  type: {
    type: String,
    enum: [
      'message',              // 新訊息
      'comment',              // 新留言
      'reply',                // 留言回覆
      'like',                 // 按讚
      'adoption_received',    // 收到認養申請
      'adoption_approved',    // 認養申請通過
      'adoption_rejected',    // 認養申請被拒
      'adoption_completed',   // 認養完成
      'pet_status_changed',   // 寵物狀態更新
      'post_published',       // 貼文發布
      'lost_pet_found',       // 走失寵物找到
      'system'                // 系統通知
    ],
    required: true
  },

  // 通知標題
  title: {
    type: String,
    required: true,
    maxlength: 100
  },

  // 通知內容
  content: {
    type: String,
    required: true,
    maxlength: 500
  },

  // 相關資源
  relatedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  relatedComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  relatedPet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  },
  relatedAdoption: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Adoption'
  },
  relatedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // 跳轉連結
  link: {
    type: String,
    maxlength: 200
  },

  // 通知圖示
  icon: {
    type: String,
    default: 'bell'
  },

  // 已讀狀態
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },

  // 優先級
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // 附加資料
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // 過期時間（通知自動清理）
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天後過期
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虛擬欄位：是否為緊急通知
notificationSchema.virtual('isUrgent').get(function() {
  return this.priority === 'urgent' || this.priority === 'high';
});

// 中間件：標記為已讀時設定時間
notificationSchema.pre('save', function(next) {
  // sanitize title/content to ensure they are strings and remove control characters
  try {
    if (this.title && typeof this.title !== 'string') this.title = String(this.title);
    if (this.content && typeof this.content !== 'string') this.content = String(this.content);

    const stripControl = (s) => {
      if (!s) return s;
      // remove C0/C1 control characters except common whitespace
      return s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').normalize ? s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').normalize('NFC') : s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    };

    if (this.title) this.title = stripControl(this.title);
    if (this.content) this.content = stripControl(this.content);
  } catch (e) {
    // ignore sanitization errors
    console.warn('Notification pre-save sanitization failed', e && e.message);
  }

  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// 靜態方法：建立新通知
notificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create(data);
  
  // Populate 相關資料
  await notification.populate([
    { path: 'sender', select: 'firstName lastName username avatar_url' },
    { path: 'relatedPet', select: 'name species photos' }
  ]);

  // 如果通知只包含 relatedAdoption，但沒有 relatedPet，嘗試從 Adoption 抓出其 pet 資訊以便前端能顯示
  let relatedPetForEmit = null;
  try {
    if ((!notification.relatedPet || notification.relatedPet == null) && (notification.relatedAdoption || (notification.metadata && notification.metadata.relatedAdoption))) {
      const AdoptionModel = require('./Adoption');
      const adoptionId = notification.relatedAdoption || (notification.metadata && notification.metadata.relatedAdoption);
      if (adoptionId) {
        const adoptionDoc = await AdoptionModel.findById(adoptionId).populate('pet', 'name species photos');
        if (adoptionDoc && adoptionDoc.pet) {
          relatedPetForEmit = adoptionDoc.pet;
          // 若資料庫中的 notification 尚未儲存 relatedPet，則回填並儲存，方便後續透過 DB 查詢取得
          try {
            if (!notification.relatedPet || String(notification.relatedPet) !== String(adoptionDoc.pet._id)) {
              notification.relatedPet = adoptionDoc.pet._id;
              await notification.save();
            }
          } catch (saveErr) {
            console.warn('Notification.createNotification: failed to persist relatedPet into notification', saveErr && saveErr.message);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Notification.createNotification: failed to enrich relatedPet from relatedAdoption', e && e.message);
  }

  // Socket.IO 即時推送
  try {
    // 嘗試取得已啟動的 io，支援不同的 server export 形式 (直接 export io 或 export app 並用 app.set('io', io))
    console.log(`Notification.createNotification: preparing to emit to recipient=${notification.recipient}`);
    const serverModule = require('../server');
    // server.js 在本專案中會把 io 存在 app 並用 app.set('io', io)，因此嘗試多種取法
    let io = null;
    try {
      if (serverModule) {
        // 直接匯出 io 的情況
        if (serverModule.io) {
          io = serverModule.io;
        }
        // 匯出 app 並且使用 app.set('io', io) 的情況
        else if (typeof serverModule.get === 'function') {
          const maybeIo = serverModule.get('io');
          if (maybeIo) io = maybeIo;
        }
      }
    } catch (getIoErr) {
      console.warn('Notification.createNotification: failed to obtain io from server module', getIoErr && getIoErr.message);
    }

    if (!io) {
      console.warn('Notification.createNotification: io instance not available - skipping emit');
    } else {
      const roomId = String(notification.recipient);
      // 檢查房間內是否有 client
      let roomClientsCount = 0;
      try {
        const clients = io.sockets.adapter.rooms.get(roomId);
        roomClientsCount = clients ? clients.size : 0;
      } catch (e) {
        console.warn('Failed to read room clients:', e && e.message);
      }
      console.log(`Notification.createNotification: emitting newNotification to room ${roomId} (clients=${roomClientsCount})`);
      io.to(roomId).emit('newNotification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        link: notification.link,
        icon: notification.icon,
        priority: notification.priority,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        sender: notification.sender,
        // include related ids so frontend can navigate/update related views
        relatedAdoption: notification.relatedAdoption || (notification.metadata && notification.metadata.relatedAdoption),
        relatedPet: notification.relatedPet || relatedPetForEmit || (notification.metadata && notification.metadata.relatedPet)
      });
      console.log('Notification.createNotification: emit done');
    }
  } catch (socketError) {
    console.error('Socket.IO 推送通知失敗:', socketError);
    // 不影響通知建立
  }

  return notification;
};

// 靜態方法：獲取用戶的通知列表
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false
  } = options;

  const query = { recipient: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  return this.find(query)
    .populate('sender', 'firstName lastName username avatar_url')
    .populate('relatedPet', 'name species photos')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// 靜態方法：標記所有通知為已讀
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { 
      $set: { 
        isRead: true,
        readAt: new Date()
      } 
    }
  );
};

// 靜態方法：獲取未讀數量
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false
  });
};

// 靜態方法：刪除過期通知
notificationSchema.statics.deleteExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// 實例方法：標記為已讀
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// 索引設定
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
