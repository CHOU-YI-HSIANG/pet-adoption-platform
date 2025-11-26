const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  postCreateSchema,
  postUpdateSchema,
  idParamSchema
} = require('../utils/validators');

const router = express.Router();

// 設定圖片上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/posts');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片文件 (JPEG, JPG, PNG, GIF, WebP)'));
    }
  }
});

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: 取得貼文列表
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [adoption, lost, found, story, discussion]
 *         description: 貼文類型
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 關鍵字搜尋
 *     responses:
 *       200:
 *         description: 成功取得貼文列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 pagination:
 *                   type: object
 */
// GET /api/posts - 獲取文章列表
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      category,
      type,
      tags,
      author,
      search,
      featured,
      sort = 'publishedAt'
    } = req.query;

    const filters = { status: 'published' };

    // Story 2.1: 類型篩選
    if (type) {
      filters.type = type;
    }

    // 分類篩選
    if (category) {
      filters.category = category;
    }

    // 標籤篩選
    if (tags) {
      filters.tags = { $in: tags.split(',') };
    }

    // 作者篩選
    if (author) {
      filters.author = author;
    }

    // 推薦文章篩選
    if (featured === 'true') {
      filters.isFeatured = true;
    }

    // 搜尋功能
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // 排序選項
    let sortObj = {};
    switch (sort) {
      case 'views':
        sortObj = { 'stats.views': -1 };
        break;
      case 'likes':
        sortObj = { 'stats.likes': -1 };
        break;
      case 'comments':
        sortObj = { 'stats.comments': -1 };
        break;
      default:
        sortObj = { publishedAt: -1 };
    }

    const posts = await Post.find(filters)
      .populate('author', 'username firstName lastName avatar_url')
      .populate('relatedPets', 'name species photos')
      .sort(sortObj)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Post.countDocuments(filters);

    // 如果使用者已登入,檢查收藏狀態和按讚狀態
    let currentUser = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUser = await User.findById(decoded.userId).select('collections');
      } catch (err) {
        // Token 無效,忽略
      }
    }

    // 為每個貼文添加 isSaved 和 isLiked 標記
    const postsWithStatus = posts.map(post => {
      const postObj = { ...post };
      if (currentUser) {
        postObj.isSaved = currentUser.collections.some(id => id.toString() === post._id.toString());
        postObj.isLiked = post.likedBy?.some(id => id.toString() === currentUser._id.toString()) || false;
      } else {
        postObj.isSaved = false;
        postObj.isLiked = false;
      }
      return postObj;
    });

    console.log('=== GET /api/posts ===');
    console.log('篩選條件:', JSON.stringify(filters));
    console.log('排序:', JSON.stringify(sortObj));
    console.log('找到貼文數:', posts.length);
    console.log('總貼文數:', total);

    const currentPage = parseInt(page);
    const totalPages = Math.ceil(total / limit);

    // 回傳扁平的結構以符合整合測試 (posts: [...])
    const payload = {
      posts: postsWithStatus,
      pagination: {
        page: currentPage,
        limit: parseInt(limit),
        totalItems: total,
        totalPages: totalPages,
        hasPrevPage: currentPage > 1,
        hasNextPage: currentPage < totalPages
      }
    };

    // 提供兩種回傳風格以兼容不同前端實作：
    // - 舊格式: { posts, pagination }
    // - 新格式: { success: true, data: { posts, pagination } }
    res.json(Object.assign({ success: true, data: payload }, payload));
  } catch (error) {
    console.error('獲取文章列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取文章列表失敗',
      error: error.message
    });
  }
});

// GET /api/posts/:id - 獲取單一文章
router.get('/:id', async (req, res) => {
  try {
    console.log('📖 獲取貼文詳情, ID:', req.params.id);
    
    const post = await Post.findById(req.params.id)
      .populate('author', 'username firstName lastName avatar_url introduction')
      .populate('relatedPets', 'name species breed photos adoptionStatus')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username firstName lastName avatar_url'
        }
      });

    console.log('貼文查詢結果:', post ? '找到' : '未找到');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的文章'
      });
    }

    // 增加瀏覽次數
    try {
      await post.incrementViews();
      console.log('✅ 瀏覽次數已更新');
    } catch (viewError) {
      console.error('⚠️ 更新瀏覽次數失敗:', viewError.message);
      // 不影響主要功能,繼續執行
    }

    // 檢查當前使用者的收藏和按讚狀態
    let isSaved = false;
    let isLiked = false;
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('檢查使用者狀態, Token 存在:', !!token);
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.userId || decoded.id;
        
        console.log('Token 解碼成功, userId:', userId);
        
        if (userId) {
          const currentUser = await User.findById(userId).select('collections');
          
          console.log('使用者查詢結果:', currentUser ? '找到' : '未找到');
          
          if (currentUser) {
            isSaved = currentUser.collections.some(id => id.toString() === post._id.toString());
            isLiked = post.likedBy?.some(id => id.toString() === currentUser._id.toString()) || false;
            console.log('isSaved:', isSaved, 'isLiked:', isLiked);
          }
        }
      } catch (err) {
        console.error('JWT 驗證錯誤:', err.message);
        // Token 無效,忽略
      }
    }

    // 將貼文轉為普通物件並添加狀態
    const postObj = post.toObject();
    postObj.isSaved = isSaved;
    postObj.isLiked = isLiked;

    console.log('✅ 成功返回貼文資料');

    res.json({
      success: true,
      data: postObj
    });
  } catch (error) {
    console.error('❌ 獲取文章錯誤:', error);
    console.error('錯誤堆疊:', error.stack);
    res.status(500).json({
      success: false,
      message: '獲取文章失敗',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: 建立新貼文
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [adoption, lost, found, story, discussion]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 最多 5 張圖片
 *     responses:
 *       201:
 *         description: 貼文建立成功
 *       401:
 *         description: 未授權
 */
// POST /api/posts - 建立新文章
router.post('/', auth, upload.array('images', 5), (req, res, next) => {
  // 調試日誌
  console.log('=== 發布貼文請求 ===');
  console.log('req.body:', req.body);
  console.log('req.files:', req.files ? req.files.length : 0);
  
  // 在驗證之前 parse JSON 欄位
  if (req.body.lostPetInfo && typeof req.body.lostPetInfo === 'string') {
    try {
      req.body.lostPetInfo = JSON.parse(req.body.lostPetInfo);
    } catch (e) {
      console.error('解析 lostPetInfo 失敗:', e);
    }
  }
  
  if (req.body.tags && typeof req.body.tags === 'string') {
    try {
      req.body.tags = JSON.parse(req.body.tags);
    } catch (e) {
      console.error('解析 tags 失敗:', e);
    }
  }
  
  if (req.body.relatedPets && typeof req.body.relatedPets === 'string') {
    try {
      req.body.relatedPets = JSON.parse(req.body.relatedPets);
    } catch (e) {
      console.error('解析 relatedPets 失敗:', e);
    }
  }
  
  next();
}, validateBody(postCreateSchema), async (req, res) => {
  try {
    const { title, content, type, category, tags, relatedPets, lostPetInfo, status = 'published' } = req.body;

    // 處理上傳的圖片
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push({
          url: `/uploads/posts/${file.filename}`,
          filename: file.filename,
          caption: '',
          alt: title
        });
      });
    }

    // 根據 type 自動設定 category (如果未提供)
    let finalCategory = category;
    if (!finalCategory) {
      const typeToCategory = {
        'lost-pet': 'lost-found',
        'found-pet': 'lost-found',
        'adoption-story': 'adoption-story',
        'general': 'general-discussion'
      };
      finalCategory = typeToCategory[type] || 'general-discussion';
    }

    const postData = {
      title,
      content,
      type: type || 'general',
      category: finalCategory,
      author: req.user.id,
      images,
      status,
      publishedAt: status === 'published' ? new Date() : null
    };

    // 處理可選欄位
    if (tags) {
      postData.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
    }

    if (relatedPets) {
      postData.relatedPets = Array.isArray(relatedPets) ? relatedPets : JSON.parse(relatedPets);
    }

    if (lostPetInfo) {
      postData.lostPetInfo = typeof lostPetInfo === 'string' ? JSON.parse(lostPetInfo) : lostPetInfo;
    }

    const post = new Post(postData);
    await post.save();

    await post.populate('author', 'username firstName lastName avatar_url');

    res.status(201).json({
      success: true,
      message: '文章建立成功',
      data: post
    });
  } catch (error) {
    console.error('建立文章錯誤:', error);
    res.status(500).json({
      success: false,
      message: '建立文章失敗',
      error: error.message
    });
  }
});

// PUT /api/posts/:id - 更新文章
router.put('/:id', auth, upload.array('images', 5), validateBody(postUpdateSchema), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的文章'
      });
    }

    // 檢查權限
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '沒有權限修改此文章'
      });
    }

    const { title, content, category, tags, relatedPets, status } = req.body;

    // 更新基本資料
    post.title = title;
    post.content = content;
    post.category = category;

    if (status) {
      post.status = status;
    }

    if (tags) {
      post.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
    }

    if (relatedPets) {
      post.relatedPets = Array.isArray(relatedPets) ? relatedPets : JSON.parse(relatedPets);
    }

    // 處理新上傳的圖片
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/posts/${file.filename}`,
        filename: file.filename,
        caption: '',
        alt: title
      }));
      post.images.push(...newImages);
    }

    await post.save();
    await post.populate('author', 'username firstName lastName avatar_url');

    res.json({
      success: true,
      message: '文章更新成功',
      data: post
    });
  } catch (error) {
    console.error('更新文章錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新文章失敗',
      error: error.message
    });
  }
});

// DELETE /api/posts/:id - 刪除文章
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的文章'
      });
    }

    // 檢查權限
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '沒有權限刪除此文章'
      });
    }

    // 軟刪除
    post.status = 'deleted';
    await post.save();

    res.json({
      success: true,
      message: '文章已刪除'
    });
  } catch (error) {
    console.error('刪除文章錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除文章失敗',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: 喜愛/取消喜愛貼文
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 操作成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 liked:
 *                   type: boolean
 *                   description: true表示已喜愛, false表示已取消
 *                 likesCount:
 *                   type: integer
 *       401:
 *         description: 未授權
 *       404:
 *         description: 貼文不存在
 */
// POST /api/posts/:id/like - 喜愛/取消喜愛文章
router.post('/:id/like', auth, async (req, res) => {
  console.log('\n🔵 ===== 按讚請求開始 =====');
  console.log('貼文 ID:', req.params.id);
  console.log('使用者:', req.user ? req.user._id : 'undefined');
  console.log('req.user 完整:', JSON.stringify(req.user ? { _id: req.user._id, email: req.user.email } : null));
  
  try {
    const post = await Post.findById(req.params.id);
    console.log('貼文查詢結果:', post ? `找到 (ID: ${post._id})` : '未找到');

    if (!post) {
      console.error('❌ 找不到貼文:', req.params.id);
      return res.status(404).json({
        success: false,
        message: '找不到指定的文章'
      });
    }

    console.log('✅ 找到貼文, 準備執行 toggleLike');
    console.log('貼文標題:', post.title);
    console.log('當前 stats:', JSON.stringify(post.stats));
    console.log('當前 likedBy 長度:', post.likedBy ? post.likedBy.length : 'undefined');
    
    const result = await post.toggleLike(req.user._id);
    console.log('✅ toggleLike 執行完成');
    console.log('更新後 stats:', JSON.stringify(post.stats));
    console.log('更新後 likedBy 長度:', post.likedBy.length);

    // 如果是按讚（不是取消），發送通知給貼文作者
    const isLiked = post.likedBy.some(id => id.toString() === req.user._id.toString());
    console.log('isLiked:', isLiked);
    console.log('post.author:', post.author);
    console.log('req.user._id:', req.user._id);
    
    if (isLiked && post.author.toString() !== req.user._id.toString()) {
      try {
        console.log('準備發送通知...');
        await Notification.createNotification({
          recipient: post.author,
          sender: req.user._id,
          type: 'like',
          title: '按讚通知',
          content: `${req.user.username || req.user.firstName} 喜歡您的貼文`,
          relatedPost: post._id,
          link: `/community/${post._id}`,
          priority: 'low'
        });
        console.log('✅ 通知發送成功');
      } catch (notifError) {
        console.error('⚠️ 發送按讚通知失敗:', notifError.message);
        console.error(notifError.stack);
        // 不影響主流程
      }
    }

    const responseData = {
      success: true,
      message: '操作成功',
      data: {
        liked: post.likedBy.some(id => id.toString() === req.user._id.toString()),
        likesCount: post.stats.likes
      }
    };
    
    console.log('準備返回回應:', JSON.stringify(responseData));
    res.json(responseData);
    console.log('✅ 回應已發送');
    console.log('===== 按讚請求結束 =====\n');
    
  } catch (error) {
    console.error('\n❌ ===== 按讚錯誤 =====');
    console.error('錯誤類型:', error.name);
    console.error('錯誤訊息:', error.message);
    console.error('錯誤堆疊:', error.stack);
    console.error('===========================\n');
    
    res.status(500).json({
      success: false,
      message: '操作失敗',
      error: error.message
    });
  }
});

// GET /api/posts/categories/list - 獲取所有分類
router.get('/categories/list', (req, res) => {
  const categories = [
    { value: 'adoption-story', label: '認養故事' },
    { value: 'care-tips', label: '照護技巧' },
    { value: 'health-info', label: '健康資訊' },
    { value: 'training', label: '訓練方法' },
    { value: 'general-discussion', label: '一般討論' },
    { value: 'lost-found', label: '走失協尋' },
    { value: 'announcement', label: '公告通知' },
    { value: 'volunteer', label: '志工招募' },
    { value: 'donation', label: '捐助相關' },
    { value: 'other', label: '其他' }
  ];

  res.json({
    success: true,
    data: categories
  });
});

// Story 2.3: PATCH /api/posts/:id/status - 更新貼文狀態 (標記已尋獲)
router.patch('/:id/status', auth, validateParams(idParamSchema), async (req, res) => {
  try {
    const { status } = req.body;
    
    // 驗證狀態值
    const validStatuses = ['draft', 'published', 'archived', 'deleted', 'found'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '無效的狀態值'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的文章'
      });
    }

    // 確認是作者本人或管理員
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '無權限修改此文章'
      });
    }

    post.status = status;
    await post.save();

    res.json({
      success: true,
      message: '狀態更新成功',
      data: post
    });
  } catch (error) {
    console.error('更新文章狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新狀態失敗',
      error: error.message
    });
  }
});

module.exports = router;