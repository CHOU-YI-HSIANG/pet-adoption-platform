const express = require('express');
const multer = require('multer');
const path = require('path');
const Pet = require('../models/Pet');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const {
  petCreateSchema,
  petUpdateSchema,
  petQuerySchema,
  idParamSchema
} = require('../utils/validators');
const router = express.Router();

// 中間件：驗證 JWT Token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要提供存取權杖' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: '無效的使用者帳號' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: '無效的存取權杖' });
  }
};

// 管理員權限檢查
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'volunteer') {
    return res.status(403).json({ error: '需要管理員權限' });
  }
  next();
};

// 設定檔案上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/pets/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pet-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // 最多 10 個檔案
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片檔案 (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// 建立 uploads 目錄
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('uploads/pets')) {
  fs.mkdirSync('uploads/pets');
}

/**
 * @swagger
 * /api/pets:
 *   get:
 *     summary: 取得寵物列表
 *     tags: [Pets]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 頁碼
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: 每頁數量
 *       - in: query
 *         name: species
 *         schema:
 *           type: string
 *           enum: [dog, cat, rabbit, bird, hamster, guinea-pig, other]
 *         description: 物種
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [small, medium, large, extra-large]
 *         description: 體型
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, unknown]
 *         description: 性別
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 關鍵字搜尋 (名稱、品種、描述)
 *     responses:
 *       200:
 *         description: 成功取得寵物列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pet'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalPets:
 *                       type: integer
 */

// 取得使用者自己發布的寵物列表（需要登入）
router.get('/my-pets', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;

    // 查詢該用戶創建的寵物（預設只顯示仍為 active 的）
    const query = {
      createdBy: req.user._id,
      isActive: true
    };

    const totalPets = await Pet.countDocuments(query);
    const totalPages = Math.ceil(totalPets / limit);

    const pets = await Pet.find(query)
      .populate('createdBy', 'username firstName lastName email')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      pets,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPets,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('取得我的寵物列表錯誤:', error);
    res.status(500).json({
      error: '取得寵物列表失敗',
      details: error.message
    });
  }
});

// 取得所有寵物（公開端點,支援篩選和分頁）
router.get('/', validateQuery(petQuerySchema), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      species,
      size,
      ageCategory,
      ageValue,
      ageUnit,
      age,
      gender,
      location,
      featured,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      // Story 1.1: Advanced Filters
      personality,
      vaccinated,
      spayed,
      microchipped,
      goodWithChildren,
      goodWithOtherPets,
      daysInShelterMin,
      daysInShelterMax,
      // Dashboard/Shelter filter
      createdBy,
      showAll // 顯示所有狀態（不只 available）
    } = req.query;

    // 建立查詢條件
    const query = {
      isActive: true
    };
    
    // 如果沒有 showAll 參數，只顯示可認養的
    if (!showAll) {
      query.adoptionStatus = 'available';
    }
    
    // 如果指定 createdBy，篩選該使用者建立的寵物
    if (createdBy) {
      query.createdBy = createdBy;
    }

    // 基本篩選條件
    if (species) query.species = species;
    if (size) query.size = size;
    if (ageCategory) query.ageCategory = ageCategory;
    // 支援合併的 age 參數
    // 新格式: 使用中文單位 (例如: "3個月", "2歲"); 同時向下相容 m/y
    if (age) {
      const raw = String(age).trim();
      // 接受: 3個月 / 3月 / 3m  或  2歲 / 2y
      const m = raw.toLowerCase().match(/^(\d+)\s*(?:個月|月|m|歲|y)$/i);
      if (m) {
        const nv = Number(m[1]);
        const u = String(raw).toLowerCase();
        let unit = 'years';
        if (u.includes('個月') || u.includes('月') || u.includes('m')) unit = 'months';
        if (!Number.isNaN(nv)) {
          query['age.value'] = nv;
          query['age.unit'] = unit;
        }
      }
    } else if (ageValue && ageUnit) {
      // backward-compatible: 支援舊的 ageValue + ageUnit 參數
      const nv = Number(ageValue);
      if (!Number.isNaN(nv)) {
        query['age.value'] = nv;
        query['age.unit'] = ageUnit;
      }
    }
    if (gender) query.gender = gender;
    if (location) query['shelterInfo.location'] = new RegExp(location, 'i');
    if (featured === 'true') query.featured = true;

    // Story 1.1: 進階篩選條件
    // 性格特徵 (多選，支援陣列)
    if (personality) {
      const personalityArray = Array.isArray(personality) ? personality : [personality];
      query['personality.traits'] = { $in: personalityArray };
    }

    // 健康狀態篩選
    if (vaccinated === 'true') query['healthStatus.vaccinated'] = true;
    if (spayed === 'true') query['healthStatus.spayed'] = true;
    if (microchipped === 'true') query['healthStatus.microchipped'] = true;

    // 特殊需求篩選 (適合兒童、其他寵物)
    if (goodWithChildren === 'true') query['personality.goodWith.children'] = true;
    if (goodWithOtherPets === 'true') query['personality.goodWith.otherPets'] = true;

    // 在收容所天數範圍篩選
    if (daysInShelterMin || daysInShelterMax) {
      const today = new Date();
      const dateQuery = {};
      
      if (daysInShelterMax) {
        const minDate = new Date(today);
        minDate.setDate(minDate.getDate() - parseInt(daysInShelterMax));
        dateQuery.$gte = minDate;
      }
      
      if (daysInShelterMin) {
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() - parseInt(daysInShelterMin));
        dateQuery.$lte = maxDate;
      }
      
      if (Object.keys(dateQuery).length > 0) {
        query['shelterInfo.intakeDate'] = dateQuery;
      }
    }

    // 搜尋功能
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { breed: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { color: new RegExp(search, 'i') }
      ];
    }

    // 排序設定
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 計算分頁
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let pets;
    // 若要以年齡排序，需要把年齡統一轉換為可比較的數值 (以月為單位)
    if (sortBy === 'age') {
      const order = sortOrder === 'desc' ? -1 : 1;
      const pipeline = [
        { $match: query },
        { $addFields: {
            ageInMonths: {
              $cond: [ { $eq: [ '$age.unit', 'months' ] }, '$age.value', { $multiply: [ '$age.value', 12 ] } ]
            }
          }
        },
        { $sort: { ageInMonths: order } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'createdBy' } },
        { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
      ];

      pets = await Pet.aggregate(pipeline);
    } else {
      // 一般排序（不按年齡）
      pets = await Pet.find(query)
        .populate('createdBy', 'username firstName lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    // 計算總數
    const total = await Pet.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      pets,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    logger.error('取得寵物列表錯誤', { error: error.message, query: req.query });
    res.status(500).json({
      error: '無法取得寵物列表',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/pets/{id}:
 *   get:
 *     summary: 取得寵物詳細資訊
 *     tags: [Pets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 寵物 ID
 *     responses:
 *       200:
 *         description: 成功取得寵物資訊
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pet'
 *       404:
 *         description: 寵物不存在
 */
// 取得單一寵物詳細資訊
router.get('/:id', async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id)
      .populate('createdBy', 'username firstName lastName')
      .populate('likes', 'username firstName lastName');

    if (!pet) {
      logger.warn('寵物不存在', { petId: req.params.id });
      return res.status(404).json({
        error: '找不到此寵物'
      });
    }

    // 增加瀏覽次數
    await pet.incrementViews();

    // 回傳符合測試預期的結構
    res.json({ pet });

  } catch (error) {
    logger.error('取得寵物詳情錯誤', { error: error.message, petId: req.params.id });
    res.status(500).json({
      error: '無法取得寵物詳情',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/pets:
 *   post:
 *     summary: 新增寵物 (需管理員權限)
 *     tags: [Pets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - species
 *               - breed
 *             properties:
 *               name:
 *                 type: string
 *               species:
 *                 type: string
 *                 enum: [dog, cat, rabbit, bird, hamster, guinea-pig, other]
 *               breed:
 *                 type: string
 *               age:
 *                 type: object
 *               gender:
 *                 type: string
 *               size:
 *                 type: string
 *               description:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: 寵物新增成功
 *       401:
 *         description: 未授權
 *       403:
 *         description: 需要管理員權限
 */
// 新增寵物（一般用戶可發布送養,管理員直接上架)
router.post('/', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'shelter';
    
    const petData = {
      ...req.body,
      createdBy: req.user._id,
      // 所有用戶發布的寵物都直接上架
      adoptionStatus: 'available',
      isActive: true
    };

    // Normalize nested age fields coming from multipart/form-data
    // Support keys like 'age[value]' and 'age[unit]' or nested object 'age'
    try {
      const ageValueRaw = req.body['age[value]'] || req.body['age.value'] || (req.body.age && req.body.age.value) || req.body['age'] || undefined;
      const ageUnitRaw = req.body['age[unit]'] || req.body['age.unit'] || (req.body.age && req.body.age.unit) || undefined;

      if (ageValueRaw !== undefined || ageUnitRaw !== undefined) {
        const parsedValue = ageValueRaw === undefined ? undefined : parseInt(ageValueRaw, 10);
        petData.age = petData.age || {};
        if (!Number.isNaN(parsedValue)) petData.age.value = parsedValue;
        if (ageUnitRaw) petData.age.unit = String(ageUnitRaw);
      }

      // If ageCategory not provided, attempt to compute from numeric age
      if (!petData.ageCategory && petData.age && petData.age.value !== undefined) {
        const v = Number(petData.age.value);
        const unit = (petData.age.unit || 'years');
        const ageInYears = unit === 'months' ? v / 12 : v;
        if (!Number.isNaN(ageInYears)) {
          if (ageInYears < 1) petData.ageCategory = 'young';
          else if (ageInYears < 7) petData.ageCategory = 'adult';
          else petData.ageCategory = 'senior';
        }
      }
    } catch (e) {
      console.warn('Normalize age failed:', e && e.message);
    }

    // 處理上傳的照片
    if (req.files && req.files.length > 0) {
      petData.photos = req.files.map((file, index) => ({
        url: `/uploads/pets/${file.filename}`,
        filename: file.filename,
        isPrimary: index === 0, // 第一張設為主要照片
        caption: req.body[`photoCaption${index}`] || ''
      }));
    }

    // 處理健康狀況
    if (req.body.healthConditions) {
      try {
        petData.healthStatus.healthConditions = JSON.parse(req.body.healthConditions);
      } catch (e) {
        console.warn('解析健康狀況 JSON 失敗:', e);
      }
    }

    // 處理藥物資訊
    if (req.body.medications) {
      try {
        petData.healthStatus.medications = JSON.parse(req.body.medications);
      } catch (e) {
        console.warn('解析藥物資訊 JSON 失敗:', e);
      }
    }

    // 處理個性特徵
    if (req.body.personalityTraits) {
      try {
        petData.personality.traits = JSON.parse(req.body.personalityTraits);
      } catch (e) {
        console.warn('解析個性特徵 JSON 失敗:', e);
      }
    }

    const pet = new Pet(petData);
    await pet.save();

    // 回傳完整的寵物資訊
    const populatedPet = await Pet.findById(pet._id)
      .populate('createdBy', 'username firstName lastName');

    res.status(201).json({
      message: '寵物資料新增成功',
      pet: populatedPet
    });

  } catch (error) {
    console.error('新增寵物錯誤:', error);
    
    // 如果建立失敗，刪除已上傳的檔案
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('刪除檔案失敗:', err);
        });
      });
    }

    res.status(400).json({
      error: '新增寵物失敗',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/pets/{id}:
 *   put:
 *     summary: 更新寵物資料 (需管理員權限)
 *     tags: [Pets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sponsorship:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   externalLink:
 *                     type: string
 *                     format: uri
 *                     pattern: ^https://
 *                     description: 助養連結 (必須使用 HTTPS)
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未授權
 *       403:
 *         description: 需要管理員權限
 */
// 更新寵物資訊（創建者或管理員可編輯）
router.put('/:id', authenticateToken, upload.array('newPhotos', 10), async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        error: '找不到此寵物'
      });
    }

    // 檢查權限：必須是創建者或管理員
    const isOwner = pet.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'shelter';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: '您沒有權限編輯此寵物資訊'
      });
    }

    // 準備更新的資料
    const updateData = {
      ...req.body,
      updatedBy: req.user._id
    };

    // Normalize age fields for updates as well (support 'age[value]' naming)
    try {
      const ageValueRaw = req.body['age[value]'] || req.body['age.value'] || (req.body.age && req.body.age.value) || req.body['age'] || undefined;
      const ageUnitRaw = req.body['age[unit]'] || req.body['age.unit'] || (req.body.age && req.body.age.unit) || undefined;
      if (ageValueRaw !== undefined || ageUnitRaw !== undefined) {
        updateData.age = updateData.age || {};
        const parsedValue = ageValueRaw === undefined ? undefined : parseInt(ageValueRaw, 10);
        if (!Number.isNaN(parsedValue)) updateData.age.value = parsedValue;
        if (ageUnitRaw) updateData.age.unit = String(ageUnitRaw);
      }

      if (!updateData.ageCategory && updateData.age && updateData.age.value !== undefined) {
        const v = Number(updateData.age.value);
        const unit = (updateData.age.unit || 'years');
        const ageInYears = unit === 'months' ? v / 12 : v;
        if (!Number.isNaN(ageInYears)) {
          if (ageInYears < 1) updateData.ageCategory = 'young';
          else if (ageInYears < 7) updateData.ageCategory = 'adult';
          else updateData.ageCategory = 'senior';
        }
      }
    } catch (e) {
      console.warn('Normalize update age failed:', e && e.message);
    }

    // 處理新上傳的照片
    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(file => ({
        url: `/uploads/pets/${file.filename}`,
        filename: file.filename,
        isPrimary: false,
        caption: ''
      }));

      // 合併新舊照片
      updateData.photos = [...(pet.photos || []), ...newPhotos];
    }

    // 處理要刪除的照片
    if (req.body.photosToDelete) {
      try {
        const photosToDelete = JSON.parse(req.body.photosToDelete);
        if (updateData.photos) {
          updateData.photos = updateData.photos.filter(photo => 
            !photosToDelete.includes(photo.filename)
          );
        }

        // 刪除實際檔案
        photosToDelete.forEach(filename => {
          fs.unlink(`uploads/pets/${filename}`, (err) => {
            if (err) console.error('刪除照片檔案失敗:', err);
          });
        });
      } catch (e) {
        console.warn('解析要刪除的照片 JSON 失敗:', e);
      }
    }

    // 更新寵物資料
    const updatedPet = await Pet.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy updatedBy', 'username firstName lastName');

    res.json({
      message: '寵物資料更新成功',
      pet: updatedPet
    });

  } catch (error) {
    console.error('更新寵物錯誤:', error);

    // 如果更新失敗，刪除新上傳的檔案
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('刪除檔案失敗:', err);
        });
      });
    }

    res.status(400).json({
      error: '更新寵物失敗',
      details: error.message
    });
  }
});

// 切換寵物喜愛狀態（需要登入）
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet || !pet.isActive) {
      return res.status(404).json({
        error: '找不到此寵物'
      });
    }

    const updatedPet = await pet.toggleLike(req.user._id);

    // 使用字串比對來判斷當前使用者是否已按讚
    const isLiked = updatedPet.likes.some(id => id && id.toString() === req.user._id.toString());

    res.json({
      message: '喜愛狀態已更新',
      likesCount: updatedPet.likes.length,
      isLiked
    });

  } catch (error) {
    console.error('切換喜愛狀態錯誤:', error);
    res.status(500).json({
      error: '無法更新喜愛狀態',
      details: error.message
    });
  }
});

// 刪除寵物（軟刪除，需要管理員權限）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        error: '找不到此寵物'
      });
    }

    // 檢查權限：必須是創建者或管理員
    const isOwner = pet.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'shelter';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: '您沒有權限刪除此寵物資訊'
      });
    }

    // 軟刪除
    pet.isActive = false;
    pet.updatedBy = req.user._id;
    await pet.save();

    res.json({
      message: '寵物資料已刪除'
    });

  } catch (error) {
    console.error('刪除寵物錯誤:', error);
    res.status(500).json({
      error: '刪除寵物失敗',
      details: error.message
    });
  }
});

// 取得特色寵物 (前端使用此端點)
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const featuredPets = await Pet.find({
      featured: true,
      adoptionStatus: 'available',
      isActive: true
    })
    .populate('createdBy', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

    res.json(featuredPets);

  } catch (error) {
    console.error('取得特色寵物錯誤:', error);
    res.status(500).json({
      error: '無法取得特色寵物',
      details: error.message
    });
  }
});

// 取得特色寵物列表 (舊端點保留相容性)
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const featuredPets = await Pet.find({
      featured: true,
      adoptionStatus: 'available',
      isActive: true
    })
    .populate('createdBy', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

    res.json(featuredPets);

  } catch (error) {
    console.error('取得特色寵物錯誤:', error);
    res.status(500).json({
      error: '無法取得特色寵物',
      details: error.message
    });
  }
});

// 取得寵物統計資訊
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Promise.all([
      Pet.countDocuments({ adoptionStatus: 'available', isActive: true }),
      Pet.countDocuments({ adoptionStatus: 'adopted' }),
      Pet.countDocuments({ adoptionStatus: 'pending' }),
      Pet.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$species', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      available: stats[0],
      adopted: stats[1],
      pending: stats[2],
      bySpecies: stats[3]
    });

  } catch (error) {
    console.error('取得統計資訊錯誤:', error);
    res.status(500).json({
      error: '無法取得統計資訊',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/pets/{id}/sponsorship/click:
 *   post:
 *     summary: 記錄助養連結點擊
 *     description: Epic 3 Story 3.6 - 記錄使用者點擊助養連結的次數
 *     tags: [Pets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 寵物 ID
 *     responses:
 *       200:
 *         description: 點擊記錄成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 clickCount:
 *                   type: integer
 *                   description: 總點擊次數
 *       400:
 *         description: 寵物未啟用助養功能
 *       404:
 *         description: 寵物不存在
 */
// Story 3.6: 記錄助養連結點擊
router.post('/:id/sponsorship/click', async (req, res) => {
  try {
    const { id } = req.params;

    // 驗證 Pet ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: '無效的寵物 ID' });
    }

    // 查詢寵物
    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({ error: '找不到該寵物' });
    }

    // 檢查助養是否啟用
    if (!pet.sponsorship || !pet.sponsorship.enabled) {
      return res.status(400).json({ error: '此寵物未啟用助養功能' });
    }

    // 檢查是否有外部連結
    if (!pet.sponsorship.externalLink) {
      return res.status(400).json({ error: '未設定助養連結' });
    }

    // 更新點擊統計 (非同步處理,不阻塞回應)
    pet.sponsorship.clickCount = (pet.sponsorship.clickCount || 0) + 1;
    pet.sponsorship.lastClickedAt = new Date();
    
    await pet.save();

    logger.info(`助養點擊記錄 - Pet ID: ${id}, 總點擊數: ${pet.sponsorship.clickCount}`);

    res.json({
      success: true,
      clickCount: pet.sponsorship.clickCount,
      message: '已記錄助養點擊'
    });

  } catch (error) {
    console.error('記錄助養點擊錯誤:', error);
    res.status(500).json({
      error: '無法記錄助養點擊',
      details: error.message
    });
  }
});

module.exports = router;