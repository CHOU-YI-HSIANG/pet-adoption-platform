const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  // 評論內容
  content: {
    type: String,
    required: [true, '評論內容為必填項目'],
    trim: true,
    minlength: [1, '評論內容至少需要 1 個字元'],
    maxlength: [1000, '評論內容不能超過 1000 個字元']
  },
  
  // 關聯資訊
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, '所屬文章為必填項目']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '評論作者為必填項目']
  },
  
  // 回覆結構 (巢狀評論)
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  
  // 評論狀態
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'hidden'],
      message: '請選擇有效的評論狀態'
    },
    default: 'approved'
  },
  
  // 互動統計
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 檢舉和審核
  reports: [{
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'],
      required: true
    },
    description: {
      type: String,
      maxlength: [500, '檢舉說明不能超過 500 個字元']
    },
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 審核資訊
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  moderationReason: {
    type: String,
    maxlength: [200, '審核原因不能超過 200 個字元']
  },
  
  // 編輯歷史
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  
  // IP 地址 (用於防濫用)
  ipAddress: {
    type: String
  },
  
  // 排序權重
  sortWeight: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虛擬欄位：回覆數量
commentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// 虛擬欄位：是否為回覆
commentSchema.virtual('isReply').get(function() {
  return this.parentComment !== null;
});

// 虛擬欄位：評論層級
commentSchema.virtual('level').get(function() {
  return this.parentComment ? 1 : 0;
});

// 中間件：儲存編輯歷史
commentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.editHistory.push({
      content: this.content,
      editedAt: new Date()
    });
    this.isEdited = true;
  }
  next();
});

// 中間件：更新文章評論數量
commentSchema.post('save', async function(doc) {
  if (doc.status === 'approved') {
    await mongoose.model('Post').findByIdAndUpdate(
      doc.post,
      { $inc: { 'stats.comments': 1 } }
    );
  }
});

commentSchema.post('remove', async function(doc) {
  await mongoose.model('Post').findByIdAndUpdate(
    doc.post,
    { $inc: { 'stats.comments': -1 } }
  );
});

// 靜態方法：獲取文章的評論
commentSchema.statics.getByPost = function(postId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc',
    includeReplies = true
  } = options;
  
  const query = {
    post: postId,
    status: 'approved',
    parentComment: includeReplies ? { $exists: true } : null
  };
  
  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;
  
  return this.find(query)
    .populate('author', 'username firstName lastName avatar_url')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'username firstName lastName avatar_url'
      }
    })
    .sort(sortObj)
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// 靜態方法：獲取用戶的評論
commentSchema.statics.getByUser = function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  
  return this.find({
    author: userId,
    status: { $in: ['approved', 'pending'] }
  })
    .populate('post', 'title slug')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// 實例方法：切換喜愛狀態
commentSchema.methods.toggleLike = async function(userId) {
  // 確保 likedBy 存在
  if (!this.likedBy) {
    this.likedBy = [];
  }
  
  // 使用字串比較
  const userIdStr = userId.toString();
  const likeIndex = this.likedBy.findIndex(id => id.toString() === userIdStr);
  
  let updateData;
  if (likeIndex > -1) {
    this.likedBy.splice(likeIndex, 1);
    this.likes = Math.max(0, this.likes - 1);
    updateData = {
      $pull: { likedBy: userId },
      $inc: { likes: -1 }
    };
  } else {
    this.likedBy.push(userId);
    this.likes += 1;
    updateData = {
      $addToSet: { likedBy: userId },
      $inc: { likes: 1 }
    };
  }
  
  // 使用 updateOne 避免觸發完整文檔驗證
  await this.constructor.updateOne(
    { _id: this._id },
    updateData,
    { runValidators: false }
  );
  
  return this;
};

// 實例方法：檢舉評論
commentSchema.methods.report = function(reporterId, reason, description) {
  this.reports.push({
    reporter: reporterId,
    reason: reason,
    description: description,
    reportedAt: new Date()
  });
  
  // 如果檢舉數量達到閾值，自動隱藏評論
  if (this.reports.length >= 5) {
    this.status = 'hidden';
  }
  
  return this.save();
};

// 實例方法：審核評論
commentSchema.methods.moderate = function(moderatorId, status, reason) {
  this.status = status;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationReason = reason;
  
  return this.save();
};

// 實例方法：添加回覆
commentSchema.methods.addReply = async function(replyId) {
  if (!this.replies.includes(replyId)) {
    this.replies.push(replyId);
    
    // 使用 updateOne 避免觸發完整文檔驗證
    await this.constructor.updateOne(
      { _id: this._id },
      { $addToSet: { replies: replyId } },
      { runValidators: false }
    );
  }
  return this;
};

// 索引設定
commentSchema.index({ post: 1, status: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ status: 1, createdAt: -1 });
commentSchema.index({ 'reports.reporter': 1 });

module.exports = mongoose.model('Comment', commentSchema);