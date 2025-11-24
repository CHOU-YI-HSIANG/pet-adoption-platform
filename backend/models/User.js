const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Google OAuth 資訊
  google_id: {
    type: String,
    unique: true,
    sparse: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  
  // 基本資訊
  username: {
    type: String,
    trim: true,
    minlength: [3, '使用者名稱至少需要 3 個字元'],
    maxlength: [30, '使用者名稱不能超過 30 個字元']
  },
  email: {
    type: String,
    required: [true, '電子郵件為必填項目'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '請輸入有效的電子郵件格式']
  },
  password: {
    type: String,
    minlength: [6, '密碼至少需要 6 個字元']
  },
  name: {
    type: String,
    required: [true, '姓名為必填項目'],
    trim: true,
    maxlength: [50, '姓名不能超過 50 個字元']
  },
  
  // 個人資訊
  firstName: {
    type: String,
    trim: true,
    maxlength: [20, '姓氏不能超過 20 個字元']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [20, '名字不能超過 20 個字元']
  },
  
  // 聯絡資訊
  contact_info: {
    phone: {
      type: String,
      match: [/^09\d{8}$/, '請輸入有效的台灣手機號碼格式 (09xxxxxxxx)']
    },
    address: {
      type: String,
      maxlength: [200, '地址不能超過 200 個字元']
    },
    line_id: {
      type: String,
      maxlength: [50, 'LINE ID 不能超過 50 個字元']
    }
  },
  
  // 地址資訊 (保留舊格式以兼容)
  address: {
    city: String,
    district: String,
    street: String,
    zipCode: {
      type: String,
      match: [/^\d{3}(\d{2})?$/, '請輸入有效的郵遞區號']
    }
  },
  
  // 個人檔案
  avatar_url: {
    type: String,
    default: null
  },
  introduction: {
    type: String,
    maxlength: [500, '自我介紹不能超過 500 個字元']
  },
  
  // 系統相關
  role: {
    type: String,
    enum: ['user', 'shelter', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // 使用者偏好
  preferences: {
    pet_types: [{
      type: String,
      enum: ['狗', '貓', '兔子', '鳥類', '其他']
    }],
    sizes: [{
      type: String,
      enum: ['小型', '中型', '大型']
    }],
    ages: [{
      type: String,
      enum: ['幼年', '成年', '老年']
    }],
    notification_preferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    }
  },
  
  // Story 1.2: 推薦系統偏好設定
  recommendationProfile: {
    species: [{
      type: String,
      enum: ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'guinea-pig', 'other']
    }],
    sizes: [{
      type: String,
      enum: ['small', 'medium', 'large', 'extra-large']
    }],
    ageCategories: [{
      type: String,
      enum: ['young', 'adult', 'senior']
    }],
    personality: [{
      type: String,
      enum: ['friendly', 'playful', 'calm', 'energetic', 'independent', 
             'social', 'shy', 'gentle', 'curious', 'loyal', 'protective', 
             'affectionate', 'needs-training']
    }],
    healthPreferences: {
      vaccinated: { type: Boolean, default: false },
      spayed: { type: Boolean, default: false },
      microchipped: { type: Boolean, default: false }
    },
    specialNeeds: {
      goodWithChildren: { type: Boolean, default: false },
      goodWithOtherPets: { type: Boolean, default: false }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Story 3.2: 進階配對演算法 - 生活方式檔案
  lifestyleProfile: {
    activityLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    availableTime: {
      type: String,
      enum: ['minimal', 'moderate', 'extensive']
    },
    housingType: {
      type: String,
      enum: ['apartment', 'condo', 'townhouse', 'house-no-yard', 'house-with-yard']
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Story 3.2: 經驗檔案
  experienceProfile: {
    petOwnershipExperience: {
      type: String,
      enum: ['none', 'beginner', 'intermediate', 'experienced'],
      default: 'none'
    },
    previousPets: [{
      species: String,
      yearsOwned: Number
    }],
    trainingExperience: Boolean,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Story 3.2: 環境檔案
  environmentProfile: {
    hasChildren: Boolean,
    childrenAges: [{
      type: String,
      enum: ['0-3', '4-6', '7-12', '13+']
    }],
    hasOtherPets: Boolean,
    otherPets: [{
      species: String,
      temperament: String
    }],
    noiseSensitive: Boolean,
    hasAllergies: Boolean,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Story 1.3: 瀏覽歷史
  browsingHistory: [{
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 社群功能
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  }],
  collections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  
  // 認養相關
  adoptionHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Adoption'
  }],
  
  // 統計資訊
  stats: {
    posts_count: { type: Number, default: 0 },
    pets_count: { type: Number, default: 0 },
    adoptions_count: { type: Number, default: 0 },
    followers_count: { type: Number, default: 0 },
    following_count: { type: Number, default: 0 }
  },
  
  // 時間戳記
  lastLogin: Date,
  last_activity: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虛擬欄位：全名
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// 虛擬欄位：完整地址
userSchema.virtual('fullAddress').get(function() {
  return `${this.address.zipCode || ''} ${this.address.city}${this.address.district}${this.address.street}`.trim();
});

// 密碼加密中間件
userSchema.pre('save', async function(next) {
  // 只有在密碼被修改時才加密
  if (!this.isModified('password')) return next();
  
  // Google 登入用戶可能沒有密碼
  if (!this.password) return next();
  
  try {
    // 加密密碼
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密碼驗證方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Google 登入用戶沒有密碼
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// 取得安全的使用者資訊（不包含密碼）
userSchema.methods.toSafeObject = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// 更新最後登入時間
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// 索引設定
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'address.city': 1, 'address.district': 1 });

module.exports = mongoose.model('User', userSchema);