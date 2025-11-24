const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // 基本資訊
  title: {
    type: String,
    required: [true, '文章標題為必填項目'],
    trim: true,
    maxlength: [100, '標題不能超過 100 個字元']
  },
  content: {
    type: String,
    required: [true, '文章內容為必填項目'],
    trim: true,
    minlength: [10, '內容至少需要 10 個字元'],
    maxlength: [5000, '內容不能超過 5000 個字元']
  },
  excerpt: {
    type: String,
    maxlength: [200, '摘要不能超過 200 個字元']
  },
  
  // 作者資訊
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作者為必填項目']
  },
  
  // 分類和標籤
  category: {
    type: String,
    enum: {
      values: [
        'adoption-story',     // 認養故事
        'care-tips',         // 照護技巧  
        'health-info',       // 健康資訊
        'training',          // 訓練方法
        'general-discussion', // 一般討論
        'lost-found',        // 走失協尋
        'announcement',      // 公告通知
        'volunteer',         // 志工招募
        'donation',          // 捐助相關
        'other'             // 其他
      ],
      message: '請選擇有效的文章分類'
    },
    default: 'general-discussion'
  },
  // Story 2.1: 貼文類型
  type: {
    type: String,
    required: [true, '貼文類型為必填項目'],
    enum: {
      values: [
        'general',        // 一般貼文
        'lost-pet',       // 走失寵物
        'found-pet',      // 發現寵物
        'adoption-story'  // 領養故事
      ],
      message: '請選擇有效的貼文類型'
    },
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, '標籤不能超過 30 個字元']
  }],
  
  // 相關寵物
  relatedPets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  }],
  
  // 媒體內容
  images: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      maxlength: [200, '圖片說明不能超過 200 個字元']
    },
    alt: {
      type: String,
      maxlength: [100, 'Alt 文字不能超過 100 個字元']
    }
  }],
  
  // 文章狀態
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived', 'deleted', 'found'],
      message: '請選擇有效的文章狀態'
    },
    default: 'published'
  },
  publishedAt: {
    type: Date
  },
  
  // Story 2.3: 走失寵物資訊
  lostPetInfo: {
    petName: {
      type: String,
      trim: true,
      maxlength: [50, '寵物名稱不能超過 50 個字元']
    },
    species: {
      type: String,
      enum: ['dog', 'cat', 'other']
    },
    lastSeenLocation: {
      type: String,
      trim: true,
      maxlength: [200, '最後出現地點不能超過 200 個字元']
    },
    lastSeenDate: {
      type: Date
    },
    contactPhone: {
      type: String,
      trim: true,
      match: [/^09\d{8}$/, '請輸入有效的手機號碼格式 (09xxxxxxxx)']
    },
    reward: {
      type: Number,
      min: [0, '懸賞金額不能為負數']
    }
  },
  
  // 互動統計
  stats: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  },
  
  // 互動記錄
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 置頂和推薦
  isPinned: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // SEO 相關
  slug: {
    type: String,
    unique: true,
    trim: true
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta 描述不能超過 160 個字元']
  },
  
  // 管理資訊
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  
  // 評論設定
  allowComments: {
    type: Boolean,
    default: true
  },
  
  // 地理位置 (用於走失協尋等)
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
    address: {
      type: String,
      maxlength: [200, '地址不能超過 200 個字元']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虛擬欄位：評論列表
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
});

// 虛擬欄位：完整 URL
postSchema.virtual('url').get(function() {
  return `/posts/${this.slug || this._id}`;
});

// 虛擬欄位：閱讀時間估算
postSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(' ').length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes;
});

// 中間件：發布時設定 publishedAt
postSchema.pre('save', function(next) {
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // 自動產生摘要
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 200) + (this.content.length > 200 ? '...' : '');
  }
  
  // 自動產生 slug
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  next();
});

// 靜態方法：獲取已發布的文章
postSchema.statics.getPublished = function(filters = {}) {
  return this.find({ 
    status: 'published', 
    ...filters 
  })
  .populate('author', 'username firstName lastName avatar_url')
  .sort({ publishedAt: -1 });
};

// 靜態方法：按分類獲取文章
postSchema.statics.getByCategory = function(category) {
  return this.find({ 
    category, 
    status: 'published' 
  })
  .populate('author', 'username firstName lastName avatar_url')
  .sort({ publishedAt: -1 });
};

// 實例方法：增加瀏覽次數
postSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

// 實例方法:切換喜愛狀態
postSchema.methods.toggleLike = async function(userId) {
  // 確保 stats 和 likedBy 存在
  if (!this.stats) {
    this.stats = { views: 0, likes: 0, comments: 0, shares: 0 };
  }
  if (!this.likedBy) {
    this.likedBy = [];
  }
  
  // 使用字串比較而不是 ObjectId,因為 indexOf 對 ObjectId 不可靠
  const userIdStr = userId.toString();
  const likeIndex = this.likedBy.findIndex(id => id.toString() === userIdStr);
  
  let updateData;
  if (likeIndex > -1) {
    this.likedBy.splice(likeIndex, 1);
    this.stats.likes = Math.max(0, this.stats.likes - 1);
    updateData = {
      $pull: { likedBy: userId },
      $inc: { 'stats.likes': -1 }
    };
  } else {
    this.likedBy.push(userId);
    this.stats.likes += 1;
    updateData = {
      $addToSet: { likedBy: userId },
      $inc: { 'stats.likes': 1 }
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

// 實例方法：更新評論數量
postSchema.methods.updateCommentCount = async function() {
  const count = await mongoose.model('Comment').countDocuments({ 
    post: this._id,
    status: 'approved'
  });
  this.stats.comments = count;
  
  // 使用 updateOne 避免觸發完整文檔驗證
  await this.constructor.updateOne(
    { _id: this._id },
    { 'stats.comments': count },
    { runValidators: false }
  );
  
  return this;
};

// 索引設定
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ category: 1, status: 1, publishedAt: -1 });
postSchema.index({ author: 1, status: 1, publishedAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ slug: 1 });
postSchema.index({ isPinned: 1, isFeatured: 1, publishedAt: -1 });
postSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Post', postSchema);