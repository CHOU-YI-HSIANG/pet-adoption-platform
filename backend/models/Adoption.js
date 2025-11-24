const mongoose = require('mongoose');

const adoptionSchema = new mongoose.Schema({
  // 基本資訊
  applicationId: {
    type: String,
    unique: true,
    required: false
  },
  
  // 關聯資訊
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: [true, '寵物資訊為必填項目']
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '申請人資訊為必填項目']
  },
  
  // 申請狀態
  status: {
    type: String,
    enum: {
      values: [
        'pending',        // 待審核
        'under-review',   // 審核中
        'approved',       // 已核准
        'rejected',       // 已拒絕
        'completed',      // 已完成認養
        'cancelled'       // 已取消
      ],
      message: '請選擇有效的申請狀態'
    },
    default: 'pending'
  },
  
  // 申請人詳細資訊
  applicantDetails: {
    // 居住環境
    housingType: {
      type: String,
      enum: ['apartment', 'house', 'condo', 'other'],
      required: false
    },
    hasYard: {
      type: Boolean,
      required: false,
      default: false
    },
    isRented: {
      type: Boolean,
      required: false,
      default: false
    },
    landlordApproval: {
      type: Boolean,
      required: function() {
        return this.applicantDetails.isRented;
      }
    },
    
    // 家庭成員
    householdMembers: {
      adults: {
        type: Number,
        required: false,
        default: 1,
        min: [1, '至少需要一位成人']
      },
      children: {
        type: Number,
        default: 0,
        min: [0, '兒童數量不能為負數']
      },
      childrenAges: [{
        type: Number,
        min: [0, '年齡不能為負數'],
        max: [18, '請輸入 18 歲以下兒童年齡']
      }]
    },
    
    // 過敏情況
    allergies: {
      hasAllergies: {
        type: Boolean,
        required: false,
        default: false
      },
      allergyDetails: {
        type: String,
        required: function() {
          return this.applicantDetails.allergies.hasAllergies;
        },
        maxlength: [500, '過敏詳情不能超過 500 個字元']
      }
    },
    
    // 寵物經驗
    petExperience: {
      hasPrevious: {
        type: Boolean,
        required: false,
        default: false
      },
      previousPets: [{
        species: String,
        yearsOwned: Number,
        whatHappened: String
      }],
      currentPets: [{
        species: String,
        age: Number,
        vaccinated: Boolean,
        spayed: Boolean
      }]
    },
    
    // 工作和時間安排
    workSchedule: {
      employmentStatus: {
        type: String,
        enum: ['employed', 'unemployed', 'retired', 'student', 'self-employed'],
        required: false
      },
      hoursAway: {
        type: Number,
        required: false,
        default: 8,
        min: [0, '離家時間不能為負數'],
        max: [24, '離家時間不能超過 24 小時']
      },
      whoWillCare: {
        type: String,
        required: false,
        maxlength: [200, '照顧者資訊不能超過 200 個字元']
      }
    },
    // 申請者年齡與職業
    age: {
      type: Number,
      required: false,
      min: [0, '年齡不能為負數'],
      max: [120, '請輸入合理的年齡']
    },
    occupation: {
      type: String,
      required: false,
      maxlength: [100, '職業不能超過 100 個字元']
    },
    
    // 獸醫資訊
    veterinarianInfo: {
      hasVet: {
        type: Boolean,
        required: false,
        default: false
      },
      vetName: {
        type: String,
        required: function() {
          return this.applicantDetails.veterinarianInfo.hasVet;
        }
      },
      vetPhone: {
        type: String,
        required: function() {
          return this.applicantDetails.veterinarianInfo.hasVet;
        }
      },
      vetAddress: {
        type: String,
        required: function() {
          return this.applicantDetails.veterinarianInfo.hasVet;
        }
      }
    }
    ,
    // 照顧計畫（顯示用欄位）
    carePlan: {
      dailyAvailableHours: {
        type: Number,
        required: false,
        min: [0, '每日可陪伴時間不能為負數'],
        max: [24, '每日可陪伴時間不可超過 24 小時']
      },
      exercisePlan: {
        type: String,
        required: false,
        maxlength: [1000, '運動/活動計畫過長']
      },
      vetCarePlan: {
        type: String,
        required: false,
        maxlength: [1000, '獸醫照護計畫過長']
      },
      financialPlan: {
        type: String,
        required: false,
        maxlength: [1000, '財務規劃過長']
      },
      otherNotes: {
        type: String,
        required: false,
        maxlength: [1000, '補充說明過長']
      }
    }
    ,
    // 居住地址（新增：儲存前端填寫的完整地址）
    address: {
      type: String,
      required: false,
      maxlength: [300, '地址不能超過 300 個字元']
    }
    ,
    // 申請者聯絡電話（前端申請表可能在 applicantDetails 層提供聯絡電話）
    contactPhone: {
      type: String,
      required: false
    }
  },
  
  // 申請原因和期望
  motivation: {
    // 允許使用者輸入自由文字的認養原因（不再強制為 enum code），
    // 但對長度做上限保護
    reasons: [{
      type: String,
      maxlength: [200, '認養原因不能超過 200 個字元']
    }],
    expectations: {
      type: String,
      required: false,
      maxlength: [1000, '認養期望不能超過 1000 個字元']
    },
    commitment: {
      type: String,
      required: false,
      maxlength: [500, '承諾聲明不能超過 500 個字元']
    }
  },

  // 原始提交資料（保留原 payload 以便後續 migration / audit）
  rawSubmission: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
    select: false
  },
  rawSubmissionMeta: {
    createdAt: { type: Date, default: Date.now },
    source: { type: String, default: 'web' },
    backfilledFrom: { type: String, default: '' },
    backfilledAt: { type: Date }
  },
  
  // 緊急聯絡人
  emergencyContact: {
    name: {
      type: String,
      required: [true, '緊急聯絡人姓名為必填項目'],
      maxlength: [50, '姓名不能超過 50 個字元']
    },
    relationship: {
      type: String,
      required: false,
      maxlength: [50, '關係不能超過 50 個字元']
    },
    phone: {
      type: String,
      required: [true, '緊急聯絡人電話為必填項目'],
      match: [/^09\d{8}$/, '請輸入有效的台灣手機號碼格式']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '請輸入有效的電子郵件格式']
    }
  },
  
  // 審核相關
  reviewNotes: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    note: {
      type: String,
      required: true,
      maxlength: [1000, '審核備註不能超過 1000 個字元']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 審核結果
  reviewDecision: {
    decision: {
      type: String,
      enum: ['approved', 'rejected']
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      maxlength: [500, '決定原因不能超過 500 個字元']
    },
    reviewDate: {
      type: Date
    }
  },
  
  // 認養完成資訊
  completionInfo: {
    adoptionDate: {
      type: Date
    },
    fee: {
      type: Number,
      min: [0, '費用不能為負數']
    },
    microchipTransferred: {
      type: Boolean,
      default: false
    },
    documentsProvided: [{
      type: String,
      enum: [
        'vaccination-record',
        'health-certificate',
        'microchip-info',
        'care-instructions',
        'food-info',
        'other'
      ]
    }],
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // 追蹤和回訪
  followUp: {
    scheduled: [{
      date: Date,
      type: {
        type: String,
        enum: ['phone', 'visit', 'email']
      },
      completed: {
        type: Boolean,
        default: false
      },
      notes: String
    }]
  },
  
  // 系統欄位
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 協議確認
  agreementAccepted: {
    type: Boolean,
    required: false,
    default: true
  },
  agreementDate: {
    type: Date,
    required: false,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虛擬欄位：申請時間長度
adoptionSchema.virtual('applicationDuration').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// 中間件：產生申請編號
adoptionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 計算今天的申請數量
    const startOfDay = new Date(year, date.getMonth(), date.getDate());
    const endOfDay = new Date(year, date.getMonth(), date.getDate() + 1);
    
    const todayCount = await this.constructor.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    
    const sequence = String(todayCount + 1).padStart(3, '0');
    this.applicationId = `AD${year}${month}${day}${sequence}`;
  }
  next();
});

// 靜態方法：根據狀態獲取申請
adoptionSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .populate('pet', 'name species breed photos adoptionStatus')
    .populate('applicant', 'firstName lastName email phone')
    .sort({ createdAt: -1 });
};

// 實例方法：更新狀態
adoptionSchema.methods.updateStatus = function(newStatus, reviewerId, reason) {
  this.status = newStatus;
  
  if (['approved', 'rejected'].includes(newStatus)) {
    this.reviewDecision = {
      decision: newStatus,
      reviewer: reviewerId,
      reason: reason,
      reviewDate: new Date()
    };
  }
  
  return this.save();
};

// 實例方法：添加審核備註
adoptionSchema.methods.addReviewNote = function(reviewerId, note) {
  this.reviewNotes.push({
    reviewer: reviewerId,
    note: note,
    createdAt: new Date()
  });
  
  return this.save();
};

// 索引設定
adoptionSchema.index({ applicationId: 1 });
adoptionSchema.index({ status: 1, createdAt: -1 });
adoptionSchema.index({ pet: 1, status: 1 });
adoptionSchema.index({ applicant: 1, createdAt: -1 });
adoptionSchema.index({ 'reviewDecision.reviewer': 1 });

module.exports = mongoose.model('Adoption', adoptionSchema);