/**
 * Joi 驗證 Schema 定義
 * 統一管理所有 API 的輸入驗證規則
 */

const Joi = require('joi');

// ============ 通用 Schema ============

/**
 * MongoDB ObjectId 驗證
 */
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('無效的 ID 格式');

/**
 * 分頁參數
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// ============ User Schema ============

/**
 * 使用者註冊驗證
 */
const userRegisterSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': '使用者名稱只能包含英文字母和數字',
      'string.min': '使用者名稱至少 3 個字元',
      'string.max': '使用者名稱最多 30 個字元',
      'any.required': '使用者名稱為必填欄位'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email 格式不正確',
      'any.required': 'Email 為必填欄位'
    }),
  
  password: Joi.string()
    .min(6)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': '密碼至少 6 個字元',
      'string.pattern.base': '密碼必須包含大小寫字母和數字',
      'any.required': '密碼為必填欄位'
    }),
  
  firstName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'any.required': '名字為必填欄位'
    }),
  
  lastName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'any.required': '姓氏為必填欄位'
    }),
  
  phone: Joi.string()
    .pattern(/^09\d{8}$/)
    .optional()
    .messages({
      'string.pattern.base': '手機號碼格式不正確 (例: 0912345678)'
    }),
  
  address: Joi.object({
    city: Joi.string().optional(),
    district: Joi.string().optional(),
    street: Joi.string().optional(),
    postalCode: Joi.string().optional()
  }).optional()
});

/**
 * 使用者登入驗證
 */
const userLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email 格式不正確',
      'any.required': 'Email 為必填欄位'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': '密碼為必填欄位'
    })
});

/**
 * 使用者資料更新驗證
 */
const userUpdateSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  bio: Joi.string().max(500).optional().allow(''),
  avatar: Joi.string().uri().optional(),
  phone: Joi.string().pattern(/^09\d{8}$/).optional().allow(''),
  address: Joi.object({
    city: Joi.string().optional().allow(''),
    district: Joi.string().optional().allow(''),
    street: Joi.string().optional().allow(''),
    postalCode: Joi.string().optional().allow('')
  }).optional(),
  preferences: Joi.object({
    petTypes: Joi.array().items(
      Joi.string().valid('dog', 'cat', 'rabbit', 'bird', 'hamster', 'guinea-pig', 'other')
    ).optional(),
    sizes: Joi.array().items(
      Joi.string().valid('small', 'medium', 'large')
    ).optional(),
    ages: Joi.array().items(
      Joi.string().valid('puppy', 'young', 'adult', 'senior')
    ).optional(),
    notificationEmail: Joi.boolean().optional(),
    notificationSms: Joi.boolean().optional()
  }).optional()
}).min(1);

// ============ Pet Schema ============

/**
 * 寵物新增驗證
 */
const petCreateSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'any.required': '寵物名稱為必填欄位'
    }),
  
  species: Joi.string()
    .valid('dog', 'cat', 'rabbit', 'bird', 'hamster', 'guinea-pig', 'other')
    .required()
    .messages({
      'any.required': '物種為必填欄位',
      'any.only': '無效的物種類型'
    }),
  
  breed: Joi.string().max(50).optional().allow(''),
  
  age: Joi.object({
    years: Joi.number().integer().min(0).max(30).required(),
    months: Joi.number().integer().min(0).max(11).default(0)
  }).required(),
  
  gender: Joi.string()
    .valid('male', 'female', 'unknown')
    .required()
    .messages({
      'any.required': '性別為必填欄位'
    }),
  
  size: Joi.string()
    .valid('small', 'medium', 'large')
    .required()
    .messages({
      'any.required': '體型為必填欄位'
    }),
  
  color: Joi.string().max(50).optional().allow(''),
  
  healthStatus: Joi.object({
    vaccinated: Joi.boolean().default(false),
    neutered: Joi.boolean().default(false),
    microchipped: Joi.boolean().default(false),
    conditions: Joi.array().items(Joi.string()).default([])
  }).optional(),
  
  personality: Joi.array()
    .items(Joi.string().valid(
      'friendly', 'shy', 'energetic', 'calm', 'playful', 
      'independent', 'affectionate', 'protective'
    ))
    .optional(),
  
  description: Joi.string().max(1000).optional().allow(''),
  
  location: Joi.object({
    shelter: Joi.string().required(),
    city: Joi.string().required(),
    district: Joi.string().optional()
  }).required(),
  
  adoptionFee: Joi.number().min(0).default(0),
  
  images: Joi.array().items(Joi.string().uri()).min(1).required()
    .messages({
      'array.min': '至少需要上傳一張照片'
    })
});

/**
 * 寵物更新驗證 (Story 3.6: 加入助養系統驗證)
 */
const petUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(50).optional(),
  breed: Joi.string().max(50).optional().allow(''),
  age: Joi.object({
    years: Joi.number().integer().min(0).max(30).optional(),
    months: Joi.number().integer().min(0).max(11).optional()
  }).optional(),
  size: Joi.string().valid('small', 'medium', 'large').optional(),
  color: Joi.string().max(50).optional().allow(''),
  healthStatus: Joi.object({
    vaccinated: Joi.boolean().optional(),
    neutered: Joi.boolean().optional(),
    microchipped: Joi.boolean().optional(),
    conditions: Joi.array().items(Joi.string()).optional()
  }).optional(),
  personality: Joi.array().items(Joi.string()).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  adoptionFee: Joi.number().min(0).optional(),
  status: Joi.string().valid('available', 'pending', 'adopted').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  
  // Story 3.6: 助養系統驗證
  sponsorship: Joi.object({
    enabled: Joi.boolean().optional(),
    externalLink: Joi.string()
      .uri({ scheme: ['https'] })  // 僅接受 HTTPS URL
      .optional()
      .allow('')
      .messages({
        'string.uri': '助養連結必須是有效的 HTTPS URL',
        'string.uriCustomScheme': '助養連結必須使用 HTTPS 協定 (例: https://example.com/donate)'
      })
  }).optional()
}).min(1);

/**
 * 寵物查詢驗證 (Story 1.1: 包含進階篩選)
 */
const petQuerySchema = Joi.object({
  // 基本篩選
  species: Joi.string().valid('dog', 'cat', 'rabbit', 'bird', 'hamster', 'guinea-pig', 'other').optional(),
  gender: Joi.string().valid('male', 'female', 'unknown').optional(),
  size: Joi.string().valid('small', 'medium', 'large').optional(),
  ageCategory: Joi.string().valid('puppy', 'young', 'adult', 'senior').optional(),
  location: Joi.string().optional(),
  featured: Joi.string().valid('true', 'false').optional(),
  search: Joi.string().max(100).optional(),
  // 合併年齡查詢: 允許中文單位，例如 "3個月" 或 "2歲"
  age: Joi.string().pattern(/^\d+\s*(?:個月|月|歲)$/).optional(),
  
  // Story 1.1: 進階篩選
  personality: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string().valid(
      'friendly', 'playful', 'calm', 'energetic', 'independent', 
      'social', 'shy', 'gentle', 'curious', 'loyal', 'protective', 
      'affectionate', 'needs-training'
    ))
  ).optional(),
  
  vaccinated: Joi.string().valid('true', 'false').optional(),
  spayed: Joi.string().valid('true', 'false').optional(),
  microchipped: Joi.string().valid('true', 'false').optional(),
  
  goodWithChildren: Joi.string().valid('true', 'false').optional(),
  goodWithOtherPets: Joi.string().valid('true', 'false').optional(),
  
  daysInShelterMin: Joi.number().integer().min(0).optional(),
  daysInShelterMax: Joi.number().integer().min(0).optional(),
  
  // 排序與分頁
  sortBy: Joi.string().valid('createdAt', 'age', 'name', 'intakeDate').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(12)
});

// ============ Adoption Schema ============

/**
 * 領養申請驗證
 */
const adoptionCreateSchema = Joi.object({
  petId: objectIdSchema.required()
    .messages({
      'any.required': '寵物 ID 為必填欄位'
    }),
  reason: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': '請簡述領養原因',
      'any.required': '領養原因為必填欄位'
    }),

  // 原有簡化欄位（向後相容）
  experience: Joi.string().max(500).optional().allow(''),

  // 與前端 mapping 相容的申請表結構（選填但若有提供會驗證結構）
  applicantDetails: Joi.object({
    housingType: Joi.string().valid('apartment', 'house', 'condo', 'other').optional(),
    hasYard: Joi.boolean().optional(),
    housingOwnership: Joi.string().valid('owned', 'rented', 'other').optional(),
    landlordApproval: Joi.boolean().optional(),
    householdMembers: Joi.object({
      adults: Joi.number().integer().min(0).optional(),
      children: Joi.number().integer().min(0).optional(),
      childrenAges: Joi.array().items(Joi.number().integer().min(0)).optional()
    }).optional(),
    allergies: Joi.object({ hasAllergies: Joi.boolean().optional(), allergyDetails: Joi.string().optional().allow('') }).optional(),
    petExperience: Joi.object({
      noExperience: Joi.boolean().optional(),
      hasPrevious: Joi.boolean().optional(),
      previousPets: Joi.array().items(Joi.object()).optional(),
      currentPets: Joi.array().items(Joi.object()).optional()
    }).optional(),
    workSchedule: Joi.object({ employmentStatus: Joi.string().optional(), hoursAway: Joi.number().optional(), whoWillCare: Joi.string().optional().allow('') }).optional(),
    veterinarianInfo: Joi.object({ hasVet: Joi.boolean().optional(), vetName: Joi.string().optional().allow(''), vetPhone: Joi.string().optional().allow(''), vetAddress: Joi.string().optional().allow('') }).optional(),
    address: Joi.string().optional().allow('')
  }).optional(),

  // 個人資訊 - age 與 occupation 會被後端用來 persist
  personalInfo: Joi.object({
    age: Joi.number().integer().min(0).optional(),
    occupation: Joi.string().max(200).optional().allow('')
  }).optional(),

  // 緊急聯絡資訊
  emergencyContact: Joi.object({ name: Joi.string().optional().allow(''), relationship: Joi.string().optional().allow(''), phone: Joi.string().optional().allow(''), email: Joi.string().email().optional().allow('') }).optional(),

  // 照顧計畫
  carePlan: Joi.object({
    veterinaryCare: Joi.string().optional().allow(''),
    exercisePlan: Joi.string().optional().allow(''),
    dailyCareTime: Joi.string().optional().allow(''),
    financialCapability: Joi.string().optional().allow(''),
    adoptionReason: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
    otherNotes: Joi.string().optional().allow(''),
    adoptionExpectations: Joi.string().optional().allow(''),
    commitmentStatement: Joi.string().optional().allow(''),
    emergencyContactName: Joi.string().optional().allow(''),
    emergencyContactPhone: Joi.string().optional().allow('')
  }).optional(),

  // 兼容舊欄位（top-level）
  age: Joi.alternatives().try(Joi.number().integer().min(0), Joi.string()).optional(),
  occupation: Joi.string().optional().allow(''),
  housingType: Joi.string().optional().allow(''),
  address: Joi.string().optional().allow(''),
  householdMembers: Joi.any().optional(),
  veterinaryCare: Joi.string().optional().allow(''),
  adoptionReason: Joi.any().optional(),
  additionalNotes: Joi.string().optional().allow('')
});

/**
 * 領養申請狀態更新驗證
 */
const adoptionStatusUpdateSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'completed')
    .required(),
  
  reviewNote: Joi.string()
    .max(500)
    .optional()
    .allow('')
});

// ============ Post Schema ============

/**
 * 貼文新增驗證
 */
const postCreateSchema = Joi.object({
  title: Joi.string()
    .max(100)
    .required()
    .messages({
      'any.required': '標題為必填欄位',
      'string.max': '標題不能超過 100 個字元'
    }),
  
  content: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.min': '內容至少 10 個字元',
      'any.required': '內容為必填欄位'
    }),
  
  type: Joi.string()
    .valid('general', 'lost-pet', 'found-pet', 'adoption-story')
    .default('general'),
  
  category: Joi.string()
    .valid(
      'adoption-story',
      'care-tips',
      'health-info',
      'training',
      'general-discussion',
      'lost-found',
      'announcement',
      'volunteer',
      'donation',
      'other'
    )
    .optional()
    .default('general-discussion'),
  
  // images 通過 multer 上傳,不在 body 中
  // images: Joi.array().items(Joi.string().uri()).max(10).optional(),
  
  tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
  
  relatedPets: Joi.array().items(Joi.string()).optional(),
  
  status: Joi.string()
    .valid('draft', 'published', 'archived')
    .optional()
    .default('published'),
  
  lostPetInfo: Joi.when('type', {
    is: Joi.string().valid('lost-pet', 'found-pet'),
    then: Joi.object({
      petName: Joi.string().max(50).optional(),
      species: Joi.string().valid('dog', 'cat', 'other').optional(),
      lastSeenLocation: Joi.string().max(200).optional(),
      lastSeenDate: Joi.date().max('now').optional(),
      contactPhone: Joi.string().pattern(/^09\d{8}$/).optional(),
      reward: Joi.number().min(0).optional()
    }).optional(),
    otherwise: Joi.forbidden()
  })
});

/**
 * 貼文更新驗證
 */
const postUpdateSchema = Joi.object({
  title: Joi.string().min(5).max(100).optional(),
  content: Joi.string().min(10).max(5000).optional(),
  images: Joi.array().items(Joi.string().uri()).max(10).optional(),
  tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
  status: Joi.string().valid('active', 'resolved', 'closed').optional()
}).min(1);

// ============ Comment Schema ============

/**
 * 留言新增驗證
 */
const commentCreateSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'any.required': '留言內容為必填欄位'
    }),
  
  post: objectIdSchema.required()
    .messages({
      'any.required': '貼文 ID 為必填欄位'
    }),
  
  parentId: objectIdSchema.optional()
});

// ============ Message Schema ============

/**
 * 訊息傳送驗證
 */
const messageCreateSchema = Joi.object({
  receiver: objectIdSchema.required()
    .messages({
      'any.required': '收件人 ID 為必填欄位'
    }),
  
  content: Joi.string()
    .min(1)
    .max(2000)
    .optional()
    .messages({
      'string.min': '訊息內容不能為空',
      'string.max': '訊息內容不能超過 2000 個字元'
    }),
  
  type: Joi.string()
    .valid('text', 'image', 'file')
    .optional()
    .default('text'),
  
  relatedPet: objectIdSchema.optional(),
  
  relatedAdoption: objectIdSchema.optional()
});

/**
 * 訊息更新驗證
 */
const messageUpdateSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'any.required': '訊息內容為必填欄位',
      'string.min': '訊息內容不能為空',
      'string.max': '訊息內容不能超過 2000 個字元'
    })
});

/**
 * Google OAuth 驗證
 */
const googleAuthSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Google token 為必填欄位'
    }),
  
  email: Joi.string()
    .email()
    .optional(),
  
  firstName: Joi.string()
    .optional(),
  
  lastName: Joi.string()
    .optional(),
  
  avatar: Joi.string()
    .uri()
    .optional()
});

// ============ Report Schema ============

/**
 * 檢舉驗證
 */
const reportSchema = Joi.object({
  reason: Joi.string()
    .valid('spam', 'inappropriate', 'harassment', 'misinformation', 'other')
    .required()
    .messages({
      'any.only': '請選擇有效的檢舉原因',
      'any.required': '檢舉原因為必填欄位'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': '檢舉說明不能超過 500 個字元'
    })
});

// ============ ID Parameter Schema ============

/**
 * MongoDB ObjectId 參數驗證
 */
const idParamSchema = Joi.object({
  id: objectIdSchema.required()
    .messages({
      'any.required': 'ID 為必填欄位'
    })
});

// ============ 匯出所有 Schema ============

module.exports = {
  // 通用
  objectIdSchema,
  paginationSchema,
  idParamSchema,
  
  // User
  userRegisterSchema,
  userLoginSchema,
  userUpdateSchema,
  googleAuthSchema,
  
  // Pet
  petCreateSchema,
  petUpdateSchema,
  petQuerySchema,
  
  // Adoption
  adoptionCreateSchema,
  adoptionStatusUpdateSchema,
  
  // Post
  postCreateSchema,
  postUpdateSchema,
  
  // Comment
  commentCreateSchema,
  
  // Message
  messageCreateSchema,
  messageUpdateSchema,
  
  // Report
  reportSchema
};
