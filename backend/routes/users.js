const express = require('express');
const User = require('../models/User');
const Adoption = require('../models/Adoption');
const { validateParams } = require('../middleware/validation');
const { idParamSchema } = require('../utils/validators');
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }
  next();
};

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: 取得當前使用者資料
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功取得使用者資料
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授權
 *   put:
 *     summary: 更新使用者資料
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               recommendationProfile:
 *                 type: object
 *                 description: 推薦偏好設定
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未授權
 */
// Story 1.4: 取得當前使用者資料
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: '找不到使用者' });
    }

    res.json(user);
  } catch (error) {
    console.error('取得使用者資料錯誤:', error);
    res.status(500).json({
      error: '無法取得使用者資料',
      details: error.message
    });
  }
});

// Story 1.4: 更新使用者資料（含推薦偏好）
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { recommendationProfile, ...otherUpdates } = req.body;
    
    const updateData = { ...otherUpdates };
    
    // 如果有推薦偏好，更新 lastUpdated
    if (recommendationProfile) {
      updateData.recommendationProfile = {
        ...recommendationProfile,
        lastUpdated: new Date()
      };
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: '找不到使用者' });
    }

    res.json({
      message: '使用者資料更新成功',
      user
    });
  } catch (error) {
    console.error('更新使用者資料錯誤:', error);
    res.status(400).json({
      error: '更新使用者資料失敗',
      details: error.message
    });
  }
});

// 取得所有使用者（管理員）
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 建立查詢條件
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // 搜尋功能
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { username: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // 排序設定
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 計算分頁
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 執行查詢
    const users = await User.find(query)
      .select('-password')
      .populate('adoptionHistory', 'applicationId status createdAt')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // 計算總數
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      users,
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
    console.error('取得使用者列表錯誤:', error);
    res.status(500).json({
      error: '無法取得使用者列表',
      details: error.message
    });
  }
});

// 取得單一使用者詳情（管理員）
router.get('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'adoptionHistory',
        populate: {
          path: 'pet',
          select: 'name species breed photos'
        }
      });

    if (!user) {
      return res.status(404).json({
        error: '找不到此使用者'
      });
    }

    res.json(user);

  } catch (error) {
    console.error('取得使用者詳情錯誤:', error);
    res.status(500).json({
      error: '無法取得使用者詳情',
      details: error.message
    });
  }
});

// 更新使用者角色（管理員）
router.put('/admin/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin', 'volunteer'].includes(role)) {
      return res.status(400).json({
        error: '無效的角色類型'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: '找不到此使用者'
      });
    }

    res.json({
      message: '使用者角色更新成功',
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('更新使用者角色錯誤:', error);
    res.status(400).json({
      error: '更新使用者角色失敗',
      details: error.message
    });
  }
});

// 停用/啟用使用者帳號（管理員）
router.put('/admin/:id/active', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: '找不到此使用者'
      });
    }

    res.json({
      message: `使用者帳號已${isActive ? '啟用' : '停用'}`,
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('更新使用者狀態錯誤:', error);
    res.status(400).json({
      error: '更新使用者狀態失敗',
      details: error.message
    });
  }
});

// 取得使用者統計資訊（管理員）
router.get('/admin/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      // 總使用者數
      User.countDocuments({ isActive: true }),
      
      // 各角色使用者數量
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      
      // 新註冊使用者（最近 30 天）
      User.countDocuments({
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      
      // 有認養歷史的使用者數
      User.countDocuments({
        isActive: true,
        adoptionHistory: { $exists: true, $not: { $size: 0 } }
      }),
      
      // 每月新註冊數量
      User.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      totalUsers: stats[0],
      usersByRole: stats[1],
      newUsersLast30Days: stats[2],
      usersWithAdoptions: stats[3],
      monthlyRegistrations: stats[4]
    });

  } catch (error) {
    console.error('取得使用者統計錯誤:', error);
    res.status(500).json({
      error: '無法取得使用者統計',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/adoptions:
 *   get:
 *     summary: 取得使用者的認養申請記錄
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 使用者ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *         description: 篩選申請狀態
 *     responses:
 *       200:
 *         description: 成功取得申請記錄
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 adoptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *       401:
 *         description: 未授權
 *       403:
 *         description: 沒有權限
 */
// 取得使用者的認養申請（本人或管理員）
router.get('/:id/adoptions', authenticateToken, async (req, res) => {
  try {
    // 檢查權限：本人或管理員
    if (req.params.id !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'volunteer') {
      return res.status(403).json({
        error: '沒有權限查看此使用者的認養申請'
      });
    }

    const { page = 1, limit = 10, status } = req.query;

    // 建立查詢條件
    const query = { applicant: req.params.id };
    if (status) query.status = status;

    // 計算分頁
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 執行查詢
    const adoptions = await Adoption.find(query)
      .populate('pet', 'name species breed photos adoptionStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 計算總數
    const total = await Adoption.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      adoptions,
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
    console.error('取得使用者認養申請錯誤:', error);
    res.status(500).json({
      error: '無法取得認養申請',
      details: error.message
    });
  }
});

// 搜尋使用者（管理員）
router.get('/admin/search', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: '搜尋關鍵字至少需要 2 個字元'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    const users = await User.find({
      $or: [
        { username: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ],
      isActive: true
    })
    .select('username firstName lastName email role createdAt')
    .limit(parseInt(limit))
    .sort({ firstName: 1, lastName: 1 });

    res.json(users);

  } catch (error) {
    console.error('搜尋使用者錯誤:', error);
    res.status(500).json({
      error: '搜尋使用者失敗',
      details: error.message
    });
  }
});

// Story 2.4: POST /api/users/saved-posts/:postId - 收藏貼文
router.post('/saved-posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者'
      });
    }

    // 檢查是否已收藏（使用字串比對處理 ObjectId）
    const postIdStr = postId.toString();
    const isSaved = user.collections.some(id => id && id.toString() === postIdStr);

    if (isSaved) {
      // 取消收藏
      user.collections = user.collections.filter(id => id.toString() !== postIdStr);
    } else {
      // 新增收藏（確保存入 ObjectId）
      user.collections.push(new require('mongoose').Types.ObjectId(postId));
    }

    await user.save();

    res.json({
      success: true,
      message: isSaved ? '已取消收藏' : '已收藏貼文',
      data: {
        saved: !isSaved,
        savedCount: user.collections.length
      }
    });

  } catch (error) {
    console.error('收藏貼文錯誤:', error);
    res.status(500).json({
      success: false,
      message: '收藏貼文失敗',
      error: error.message
    });
  }
});

// Story 2.4: GET /api/users/saved-posts - 取得已收藏貼文
router.get('/saved-posts', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'collections',
        populate: {
          path: 'author',
          select: 'firstName lastName username avatar_url'
        },
        options: {
          sort: { createdAt: -1 },
          limit: parseInt(limit),
          skip: (parseInt(page) - 1) * parseInt(limit)
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者'
      });
    }

    const total = user.collections.length;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        posts: user.collections,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('取得已收藏貼文錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得已收藏貼文失敗',
      error: error.message
    });
  }
});

// Story 1.3: GET /api/users/favorites - 取得使用者收藏的寵物
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites',
        match: { isActive: true },
        select: 'name species breed age gender size photos adoptionStatus shelterInfo createdBy',
        populate: {
          path: 'createdBy',
          select: 'username firstName lastName'
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者'
      });
    }

    res.json({
      success: true,
      data: {
        favorites: user.favorites || [],
        count: user.favorites?.length || 0
      }
    });

  } catch (error) {
    console.error('取得收藏清單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得收藏清單失敗',
      error: error.message
    });
  }
});

// Story 1.3: POST /api/users/favorites/:petId - 加入/移除收藏
router.post('/favorites/:petId', authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params;
    const Pet = require('../models/Pet');
    
    // 檢查寵物是否存在
    const pet = await Pet.findById(petId);
    if (!pet || !pet.isActive) {
      return res.status(404).json({
        success: false,
        message: '找不到此寵物'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者'
      });
    }

    // 檢查是否已收藏（使用字串比對以正確處理 ObjectId）
    const petIdStr = petId.toString();
    const isFavorited = user.favorites.some(id => id && id.toString() === petIdStr);

    if (isFavorited) {
      // 移除收藏
      user.favorites = user.favorites.filter(id => id.toString() !== petIdStr);
    } else {
      // 加入收藏（確保存入 ObjectId）
      user.favorites.push(new require('mongoose').Types.ObjectId(petId));
    }

    await user.save();

    res.json({
      success: true,
      message: isFavorited ? '已取消收藏' : '已加入收藏',
      data: {
        favorited: !isFavorited,
        favoritesCount: user.favorites.length
      }
    });

  } catch (error) {
    console.error('收藏操作錯誤:', error);
    res.status(500).json({
      success: false,
      message: '收藏操作失敗',
      error: error.message
    });
  }
});

module.exports = router;