const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  // 基本資訊
  name: {
    type: String,
    required: [true, '寵物名稱為必填項目'],
    trim: true,
    maxlength: [50, '寵物名稱不能超過 50 個字元']
  },
  species: {
    type: String,
    required: [true, '動物種類為必填項目'],
    enum: {
      values: ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'guinea-pig', 'other'],
      message: '請選擇有效的動物種類'
    }
  },
  breed: {
    type: String,
    required: [true, '品種為必填項目'],
    trim: true,
    maxlength: [100, '品種名稱不能超過 100 個字元']
  },
  
  // 外觀特徵
  gender: {
    type: String,
    required: [true, '性別為必填項目'],
    enum: {
      values: ['male', 'female', 'unknown'],
      message: '性別必須是 male、female 或 unknown'
    }
  },
  age: {
    value: {
      type: Number,
      required: [true, '年齡為必填項目'],
      min: [0, '年齡不能為負數'],
      max: [30, '年齡不能超過 30 歲']
    },
    unit: {
      type: String,
      enum: ['years', 'months'],
      default: 'years'
    }
  },
  ageCategory: {
    type: String,
    enum: ['young', 'adult', 'senior'],
    required: true
  },
  size: {
    type: String,
    required: [true, '體型為必填項目'],
    enum: {
      values: ['small', 'medium', 'large', 'extra-large'],
      message: '請選擇有效的體型大小'
    }
  },
  weight: {
    type: Number,
    min: [0, '體重不能為負數'],
    max: [100, '體重不能超過 100 公斤']
  },
  color: {
    type: String,
    required: [true, '毛色為必填項目'],
    trim: true,
    maxlength: [100, '毛色描述不能超過 100 個字元']
  },
  
  // 健康狀況
  healthStatus: {
    vaccinated: {
      type: Boolean,
      default: false
    },
    spayed: {
      type: Boolean,
      default: false
    },
    microchipped: {
      type: Boolean,
      default: false
    },
    healthConditions: [{
      condition: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
        default: 'mild'
      }
    }],
    lastVetVisit: {
      type: Date
    },
    medications: [{
      name: String,
      dosage: String,
      frequency: String
    }]
  },
  
  // 行為特徵
  personality: {
    traits: [{
      type: String,
      enum: [
        'friendly', 'shy', 'playful', 'calm', 'energetic', 
        'independent', 'social', 'protective', 'gentle', 
        'curious', 'loyal', 'active', 'quiet'
      ]
    }],
    goodWith: {
      children: {
        type: Boolean,
        default: null
      },
      otherPets: {
        type: Boolean,
        default: null
      },
      strangers: {
        type: Boolean,
        default: null
      }
    },
    activityLevel: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      required: true
    },
    specialNeeds: [{
      type: String,
      trim: true
    }]
  },
  
  // 照片和媒體
  photos: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    caption: {
      type: String,
      maxlength: [200, '照片說明不能超過 200 個字元']
    }
  }],
  
  // 標籤系統
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // 收容資訊
  shelterInfo: {
    intakeDate: {
      type: Date,
      required: [true, '入所日期為必填項目'],
      default: Date.now
    },
    source: {
      type: String,
      enum: ['stray', 'owner-surrender', 'transfer', 'born-in-shelter'],
      required: [true, '來源為必填項目']
    },
    location: {
      type: String,
      required: [true, '收容地點為必填項目'],
      trim: true
    },
    kennel: {
      type: String,
      trim: true
    }
  },
  
  // 認養狀態
  adoptionStatus: {
    type: String,
    enum: {
      values: ['available', 'pending', 'adopted', 'hold', 'not-available', 'pending_review'],
      message: '請選擇有效的認養狀態'
    },
    default: 'available'
  },
  adoptionFee: {
    type: Number,
    min: [0, '認養費用不能為負數'],
    default: 0
  },
  
  // 描述
  description: {
    type: String,
    required: [true, '動物描述為必填項目'],
    trim: true,
    minlength: [50, '描述至少需要 50 個字元'],
    maxlength: [1000, '描述不能超過 1000 個字元']
  },
  story: {
    type: String,
    maxlength: [2000, '故事不能超過 2000 個字元']
  },
  
  // 外部連結 (收容所寵物可能有外部認養頁面)
  externalLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // 允許空值
        return /^https?:\/\/.+/.test(v);
      },
      message: '外部連結必須是有效的 URL (http:// 或 https://)'
    }
  },
  
  // 系統資訊
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // 統計資訊
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 認養歷史
  adoptionHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Adoption'
  }],
  
  // 助養系統 (Story 3.6)
  sponsorship: {
    enabled: {
      type: Boolean,
      default: false
    },
    externalLink: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          // 若未啟用或連結為空，不驗證
          if (!this.sponsorship.enabled || !v) return true;
          // 驗證必須是 HTTPS URL
          return /^https:\/\/.+/.test(v);
        },
        message: '助養連結必須使用 HTTPS 協定'
      }
    },
    clickCount: {
      type: Number,
      default: 0,
      min: [0, '點擊次數不能為負數']
    },
    lastClickedAt: {
      type: Date
    }
  },
  
  // 政府開放資料欄位
  govData: {
    animalId: {
      type: String,
      sparse: true,
      unique: true // 確保不重複匯入（使用 animal_subid）
    },
    subId: String, // animal_subid - 動物的收容編號
    areaCode: String, // animal_area_pkid - 動物所屬縣市代碼
    shelterCode: String, // animal_shelter_pkid - 動物所屬收容所代碼
    foundPlace: String, // animal_foundplace - 動物尋獲地
    foundDate: Date, // animal_createtime - 資料建立時間
    openDate: Date, // animal_opendate - 開放認養時間(起)
    updateDate: Date, // animal_update - 動物資料異動時間
    closedDate: Date, // animal_closeddate - 開放認養時間(迄)
    shelterName: String, // shelter_name - 動物所屬收容所名稱
    shelterTel: String, // shelter_tel - 聯絡電話
    shelterAddress: String, // shelter_address - 地址
    title: String, // animal_title - 動物網頁標題
    caption: String, // animal_caption - 其他說明
    remark: String, // animal_remark - 資料備註
    originalData: mongoose.Schema.Types.Mixed // 保存完整的政府資料以供參考
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虛擬欄位：年齡描述
petSchema.virtual('ageDescription').get(function() {
  const value = this.age && typeof this.age.value === 'number' ? this.age.value : null;
  const unit = this.age && this.age.unit ? this.age.unit : 'years';
  if (value === null || value === undefined) return null;
  const unitText = unit === 'years' ? '歲' : '個月';
  return `${value} ${unitText}`;
});

// 虛擬欄位：主要照片
petSchema.virtual('primaryPhoto').get(function() {
  if (!this.photos || !Array.isArray(this.photos) || this.photos.length === 0) return null;
  const primary = this.photos.find(photo => photo && photo.isPrimary);
  return primary || this.photos[0] || null;
});

// 虛擬欄位：在收容所的天數
petSchema.virtual('daysInShelter').get(function() {
  const today = new Date();
  const intakeDate = this.shelterInfo && this.shelterInfo.intakeDate ? new Date(this.shelterInfo.intakeDate) : null;
  if (!intakeDate || Number.isNaN(intakeDate.getTime())) return null;
  const diffTime = Math.abs(today - intakeDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// 中間件：設定年齡類別
petSchema.pre('save', function(next) {
  const { value, unit } = this.age;
  const ageInYears = unit === 'months' ? value / 12 : value;
  
  if (ageInYears < 1) {
    this.ageCategory = 'young';
  } else if (ageInYears < 7) {
    this.ageCategory = 'adult';
  } else {
    this.ageCategory = 'senior';
  }
  
  next();
});

// 中間件：確保只有一張主要照片
petSchema.pre('save', function(next) {
  if (this.photos && this.photos.length > 0) {
    let primaryCount = 0;
    this.photos.forEach(photo => {
      if (photo.isPrimary) primaryCount++;
    });
    
    // 如果沒有主要照片，設定第一張為主要照片
    if (primaryCount === 0) {
      this.photos[0].isPrimary = true;
    }
    // 如果有多張主要照片，只保留第一張
    else if (primaryCount > 1) {
      let foundFirst = false;
      this.photos.forEach(photo => {
        if (photo.isPrimary && foundFirst) {
          photo.isPrimary = false;
        } else if (photo.isPrimary && !foundFirst) {
          foundFirst = true;
        }
      });
    }
  }
  next();
});

// 中間件：自動管理標籤
petSchema.pre('save', function(next) {
  if (!this.tags) {
    this.tags = [];
  }
  
  // 根據認養狀態自動加標籤
  const adoptedTag = '已認養';
  const availableTag = '待認養';
  const pendingTag = '審核中';
  
  // 移除所有狀態標籤
  this.tags = this.tags.filter(tag => 
    tag !== adoptedTag && tag !== availableTag && tag !== pendingTag
  );
  
  // 根據當前狀態加入對應標籤
  if (this.adoptionStatus === 'adopted') {
    this.tags.push(adoptedTag);
  } else if (this.adoptionStatus === 'available') {
    this.tags.push(availableTag);
  } else if (this.adoptionStatus === 'pending') {
    this.tags.push(pendingTag);
  }
  
  next();
});

// 靜態方法：取得可認養的寵物
petSchema.statics.getAvailablePets = function(filters = {}) {
  const query = { 
    adoptionStatus: 'available', 
    isActive: true,
    ...filters 
  };
  return this.find(query).populate('createdBy', 'username firstName lastName');
};

// 實例方法：增加瀏覽次數
// 使用原子更新避免觸發 pre-save 驗證（某些匯入資料可能不符合當前 schema）
petSchema.methods.incrementViews = function() {
  // 回傳更新後的文件
  return this.constructor.findByIdAndUpdate(
    this._id,
    { $inc: { views: 1 } },
    { new: true, runValidators: false }
  ).exec();
};

// 實例方法：切換喜愛狀態
petSchema.methods.toggleLike = function(userId) {
  const userIdStr = userId.toString();

  // 找出是否已按讚（使用字串比較以正確比對 ObjectId）
  const likeIndex = this.likes.findIndex(id => id && id.toString() === userIdStr);

  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(new mongoose.Types.ObjectId(userId));
  }

  return this.save();
};

// 索引設定
petSchema.index({ adoptionStatus: 1, isActive: 1 });
petSchema.index({ species: 1, adoptionStatus: 1 });
petSchema.index({ size: 1, adoptionStatus: 1 });
petSchema.index({ ageCategory: 1, adoptionStatus: 1 });
petSchema.index({ featured: 1, adoptionStatus: 1 });
petSchema.index({ 'shelterInfo.location': 1 });
petSchema.index({ createdAt: -1 });
// Story 1.1: Advanced Search Filters 索引
petSchema.index({ 'personality.traits': 1 });
petSchema.index({ 'personality.specialNeeds': 1 });
petSchema.index({ 'healthStatus.vaccinated': 1 });
petSchema.index({ 'healthStatus.spayed': 1 });
petSchema.index({ 'healthStatus.microchipped': 1 });
petSchema.index({ 'personality.goodWith.children': 1 });
petSchema.index({ 'personality.goodWith.otherPets': 1 });
petSchema.index({ 'shelterInfo.intakeDate': -1 });

module.exports = mongoose.model('Pet', petSchema);