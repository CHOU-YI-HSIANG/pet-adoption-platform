const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // 訊息內容
  content: {
    type: String,
    required: [true, '訊息內容為必填項目'],
    trim: true,
    maxlength: [2000, '訊息內容不能超過 2000 個字元']
  },
  
  // 訊息類型
  type: {
    type: String,
    enum: {
      values: ['text', 'image', 'file', 'system', 'adoption-update'],
      message: '請選擇有效的訊息類型'
    },
    default: 'text'
  },
  
  // 發送者和接收者
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '發送者為必填項目']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '接收者為必填項目']
  },
  
  // 對話識別碼 (用於群組對話)
  conversationId: {
    type: String,
    required: false, // 由 pre-save hook 自動生成
    index: true
  },
  
  // 相關寵物 (用於認養相關對話)
  relatedPet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  },
  
  // 相關認養申請
  relatedAdoption: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Adoption'
  },
  
  // 訊息狀態
  status: {
    type: String,
    enum: {
      values: ['sent', 'delivered', 'read', 'deleted'],
      message: '請選擇有效的訊息狀態'
    },
    default: 'sent'
  },
  
  // 讀取狀態
  readAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  
  // 附件資訊
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'audio'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String
    },
    size: {
      type: Number
    },
    mimeType: {
      type: String
    }
  }],
  
  // 訊息回覆
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // 系統訊息相關
  systemData: {
    eventType: {
      type: String,
      enum: [
        'adoption-submitted',
        'adoption-approved',
        'adoption-rejected',
        'adoption-completed',
        'pet-status-changed',
        'user-joined',
        'user-left'
      ]
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  
  // 訊息優先級
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 自動刪除設定
  expiresAt: {
    type: Date
  },
  
  // 編輯狀態
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  originalContent: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虛擬欄位：是否為系統訊息
messageSchema.virtual('isSystemMessage').get(function() {
  return this.type === 'system';
});

// 虛擬欄位：是否有附件
messageSchema.virtual('hasAttachments').get(function() {
  return this.attachments && this.attachments.length > 0;
});

// 中間件：設定對話識別碼
messageSchema.pre('save', function(next) {
  if (this.isNew && !this.conversationId) {
    // 產生對話識別碼：使用兩個用戶 ID 排序後組合
    const userIds = [this.sender.toString(), this.receiver.toString()].sort();
    this.conversationId = `${userIds[0]}_${userIds[1]}`;
  }
  
  // 設定傳送時間
  if (this.isNew) {
    this.deliveredAt = new Date();
  }
  
  next();
});

// 中間件：設定過期時間（可選）
messageSchema.pre('save', function(next) {
  if (this.isNew && this.type === 'system') {
    // 系統訊息 30 天後自動刪除
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// 靜態方法：獲取對話訊息
messageSchema.statics.getConversation = function(userId1, userId2, options = {}) {
  const {
    page = 1,
    limit = 50,
    before = null
  } = options;
  
  const userIds = [userId1.toString(), userId2.toString()].sort();
  const conversationId = `${userIds[0]}_${userIds[1]}`;
  
  const query = {
    conversationId,
    status: { $ne: 'deleted' }
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .populate('sender', 'username firstName lastName avatar_url')
    .populate('receiver', 'username firstName lastName avatar_url')
    .populate('relatedPet', 'name species photos')
    .populate('replyTo', 'content sender createdAt')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// 靜態方法：獲取用戶的所有對話列表
messageSchema.statics.getUserConversations = async function(userId) {
  console.log('getUserConversations called for userId:', userId);
  
  // 先查詢所有相關訊息
  const allMessages = await this.find({
    $or: [
      { sender: userId },
      { receiver: userId }
    ],
    status: { $ne: 'deleted' }
  }).limit(10);
  
  console.log('找到訊息總數:', allMessages.length);
  console.log('訊息sample:', allMessages.slice(0, 2).map(m => ({
    conversationId: m.conversationId,
    sender: m.sender,
    receiver: m.receiver,
    content: m.content?.substring(0, 20)
  })));
  
  return this.aggregate([
    {
      $match: {
        $or: [
          { sender: new mongoose.Types.ObjectId(userId) },
          { receiver: new mongoose.Types.ObjectId(userId) }
        ],
        status: { $ne: 'deleted' },
        conversationId: { $exists: true, $ne: null, $ne: '' }
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$status', 'delivered'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.sender',
        foreignField: '_id',
        as: 'senderInfo'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.receiver',
        foreignField: '_id',
        as: 'receiverInfo'
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);
};

// 實例方法：標記為已讀
messageSchema.methods.markAsRead = function() {
  if (this.status === 'delivered') {
    this.status = 'read';
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// 實例方法：編輯訊息
messageSchema.methods.editContent = function(newContent) {
  if (this.type === 'text' && !this.isEdited) {
    this.originalContent = this.content;
  }
  
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  
  return this.save();
};

// 實例方法：軟刪除訊息
messageSchema.methods.softDelete = function() {
  this.status = 'deleted';
  return this.save();
};

// 靜態方法：標記對話為已讀
messageSchema.statics.markConversationAsRead = function(conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      receiver: userId,
      status: 'delivered'
    },
    {
      $set: {
        status: 'read',
        readAt: new Date()
      }
    }
  );
};

// 靜態方法：創建系統訊息
messageSchema.statics.createSystemMessage = function(data) {
  const {
    sender,
    receiver,
    eventType,
    metadata,
    relatedPet,
    relatedAdoption
  } = data;
  
  let content = '';
  
  // 根據事件類型生成系統訊息內容
  switch (eventType) {
    case 'adoption-submitted':
      content = '您的認養申請已提交，我們會盡快審核。';
      break;
    case 'adoption-approved':
      content = '恭喜！您的認養申請已通過審核。';
      break;
    case 'adoption-rejected':
      content = '很抱歉，您的認養申請未通過審核。';
      break;
    case 'adoption-completed':
      content = '認養程序已完成，感謝您給毛孩一個溫暖的家！';
      break;
    case 'pet-status-changed':
      content = `寵物狀態已更新為：${metadata?.newStatus}`;
      break;
    default:
      content = '系統通知';
  }
  
  return this.create({
    content,
    type: 'system',
    sender,
    receiver,
    relatedPet,
    relatedAdoption,
    systemData: {
      eventType,
      metadata
    }
  });
};

// 索引設定
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, status: 1 });
messageSchema.index({ relatedPet: 1 });
messageSchema.index({ relatedAdoption: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);