const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  messageCreateSchema,
  messageUpdateSchema,
  idParamSchema
} = require('../utils/validators');

const router = express.Router();

// 設定檔案上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/messages');
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
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    // 允許圖片、文件、音頻、視頻
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|mp3|wav|mp4|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('不支援的檔案類型'));
    }
  }
});

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: 取得對話列表
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功取得對話列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       conversationId:
 *                         type: string
 *                       otherUser:
 *                         $ref: '#/components/schemas/User'
 *                       lastMessage:
 *                         type: object
 *                       unreadCount:
 *                         type: integer
 *       401:
 *         description: 未授權
 */
// GET /api/messages/conversations - 獲取用戶的對話列表
router.get('/conversations', auth, async (req, res) => {
  try {
    console.log('獲取對話列表 - 用戶ID:', req.user.id);
    
    // 先修復沒有conversationId的訊息
    const messagesWithoutConvId = await Message.find({ 
      conversationId: { $exists: false } 
    }).limit(100);
    
    if (messagesWithoutConvId.length > 0) {
      console.log(`發現${messagesWithoutConvId.length}條訊息沒有conversationId，正在修復...`);
      for (const msg of messagesWithoutConvId) {
        const userIds = [msg.sender.toString(), msg.receiver.toString()].sort();
        msg.conversationId = `${userIds[0]}_${userIds[1]}`;
        await msg.save();
      }
      console.log('conversationId修復完成');
    }
    
    const conversations = await Message.getUserConversations(req.user.id);
    console.log('找到對話數量:', conversations.length);
    
    // 處理對話資料，計算對方用戶資訊
    const processedConversations = conversations.map(conv => {
      const lastMessage = conv.lastMessage;
      const isCurrentUserSender = lastMessage.sender.toString() === req.user.id;
      
      // 確定對話對象
      const otherUser = isCurrentUserSender ? 
        conv.receiverInfo[0] : conv.senderInfo[0];
      
      return {
        conversationId: conv._id,
        otherUser: {
          _id: otherUser._id,
          username: otherUser.username,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          avatar_url: otherUser.avatar_url
        },
        lastMessage: {
          content: lastMessage.content,
          type: lastMessage.type,
          createdAt: lastMessage.createdAt,
          isFromCurrentUser: isCurrentUserSender
        },
        unreadCount: conv.unreadCount
      };
    });

    res.json({
      success: true,
      data: processedConversations
    });
  } catch (error) {
    console.error('獲取對話列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取對話列表失敗',
      error: error.message
    });
  }
});

// GET /api/messages/conversation/:userId - 獲取與特定用戶的對話記錄
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    // 檢查對方用戶是否存在
    const otherUser = await User.findById(userId).select('username firstName lastName avatar_url');
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的用戶'
      });
    }

    const messages = await Message.getConversation(req.user.id, userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      before: before ? new Date(before) : null
    });

    // 標記對話為已讀
    const userIds = [req.user.id, userId].sort();
    const conversationId = `${userIds[0]}_${userIds[1]}`;
    await Message.markConversationAsRead(conversationId, req.user.id);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // 反轉以按時間順序顯示
        otherUser,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('獲取對話記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取對話記錄失敗',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: 傳送訊息
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - receiver
 *               - content
 *             properties:
 *               receiver:
 *                 type: string
 *                 description: 接收者 ID
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: 訊息傳送成功
 *       401:
 *         description: 未授權
 */
// POST /api/messages - 發送訊息
router.post('/', auth, upload.single('file'), validateBody(messageCreateSchema), async (req, res) => {
  try {
    const { content, receiver, type = 'text', relatedPet, relatedAdoption } = req.body;

    // 檢查接收者是否存在
    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的接收者'
      });
    }

    // 檢查是否發送給自己 (機構帳號允許,一般用戶不允許)
    const senderUser = await User.findById(req.user.id);
    const isShelterOrAdmin = senderUser && (senderUser.role === 'shelter' || senderUser.role === 'admin');
    
    if (receiver === req.user.id && !isShelterOrAdmin) {
      return res.status(400).json({
        success: false,
        message: '不能發送訊息給自己'
      });
    }

    const messageData = {
      sender: req.user.id,
      receiver,
      type
    };

    // 處理不同類型的訊息
    if (type === 'text') {
      if (!content) {
        return res.status(400).json({
          success: false,
          message: '文字訊息內容不能為空'
        });
      }
      messageData.content = content;
    } else if (['image', 'file'].includes(type)) {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '檔案訊息必須包含檔案'
        });
      }

      // 判斷檔案類型
      const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
      messageData.type = fileType;
      messageData.content = content || `發送了一個${fileType === 'image' ? '圖片' : '檔案'}`;
      
      messageData.attachments = [{
        type: fileType,
        url: `/uploads/messages/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }];
    }

    // 添加相關資訊
    if (relatedPet) {
      messageData.relatedPet = relatedPet;
    }
    if (relatedAdoption) {
      messageData.relatedAdoption = relatedAdoption;
    }

    const message = new Message(messageData);
    await message.save();

    await message.populate([
      { path: 'sender', select: 'username firstName lastName avatar_url' },
      { path: 'receiver', select: 'username firstName lastName avatar_url' },
      { path: 'relatedPet', select: 'name species photos' }
    ]);

    // 發送通知給接收者
    try {
      const sender = await User.findById(req.user.id);
      await Notification.createNotification({
        recipient: receiver,
        sender: req.user.id,
        type: 'message',
        title: '新訊息',
        content: `${sender.username || sender.firstName} 傳送了一則訊息給您`,
        relatedMessage: message._id,
        link: `/messages/${req.user.id}`,
        priority: 'normal'
      });
    } catch (notifError) {
      console.error('發送訊息通知失敗:', notifError);
      // 不影響主流程
    }

    res.status(201).json({
      success: true,
      message: '訊息發送成功',
      data: message
    });

    // 這裡可以添加 Socket.IO 發送即時通知
    // req.app.get('io').to(receiver).emit('newMessage', message);

  } catch (error) {
    console.error('=== 發送訊息錯誤 - 詳細信息 ===');
    console.error('錯誤訊息:', error.message);
    console.error('錯誤堆疊:', error.stack);
    console.error('請求內容:', {
      content: req.body.content,
      receiver: req.body.receiver,
      type: req.body.type,
      sender: req.user?.id,
      senderRole: req.user?.role
    });
    console.error('錯誤名稱:', error.name);
    if (error.errors) {
      console.error('驗證錯誤:', JSON.stringify(error.errors, null, 2));
    }
    console.error('==============================');
    
    res.status(500).json({
      success: false,
      message: '發送訊息失敗',
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => error.errors[key].message) : []
    });
  }
});

// PUT /api/messages/:id - 編輯訊息
router.put('/:id', auth, validateBody(messageUpdateSchema), async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的訊息'
      });
    }

    // 檢查權限
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '沒有權限編輯此訊息'
      });
    }

    // 檢查訊息類型
    if (message.type !== 'text') {
      return res.status(400).json({
        success: false,
        message: '只能編輯文字訊息'
      });
    }

    // 檢查是否在可編輯時間內（例如：發送後 5 分鐘內可編輯）
    const editTimeLimit = 5 * 60 * 1000; // 5 分鐘
    if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
      return res.status(403).json({
        success: false,
        message: '訊息發送超過 5 分鐘後無法編輯'
      });
    }

    await message.editContent(content);
    await message.populate([
      { path: 'sender', select: 'username firstName lastName avatar_url' },
      { path: 'receiver', select: 'username firstName lastName avatar_url' }
    ]);

    res.json({
      success: true,
      message: '訊息編輯成功',
      data: message
    });
  } catch (error) {
    console.error('發送訊息錯誤 - 詳細信息:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    res.status(500).json({
      success: false,
      message: '發送訊息失敗',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE /api/messages/:id - 刪除訊息
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的訊息'
      });
    }

    // 檢查權限
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '沒有權限刪除此訊息'
      });
    }

    await message.softDelete();

    res.json({
      success: true,
      message: '訊息已刪除'
    });
  } catch (error) {
    console.error('刪除訊息錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除訊息失敗',
      error: error.message
    });
  }
});

// POST /api/messages/:id/read - 標記訊息為已讀
router.post('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的訊息'
      });
    }

    // 檢查權限（只有接收者可以標記為已讀）
    if (message.receiver.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '沒有權限標記此訊息'
      });
    }

    await message.markAsRead();

    res.json({
      success: true,
      message: '訊息已標記為已讀'
    });
  } catch (error) {
    console.error('標記已讀錯誤:', error);
    res.status(500).json({
      success: false,
      message: '標記已讀失敗',
      error: error.message
    });
  }
});

// POST /api/messages/conversation/:userId/read-all - 標記與特定用戶的對話為已讀
router.post('/conversation/:userId/read-all', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // 檢查用戶是否存在
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的用戶'
      });
    }

    const userIds = [req.user.id, userId].sort();
    const conversationId = `${userIds[0]}_${userIds[1]}`;
    
    const result = await Message.markConversationAsRead(conversationId, req.user.id);

    res.json({
      success: true,
      message: '對話已標記為已讀',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('標記對話已讀錯誤:', error);
    res.status(500).json({
      success: false,
      message: '標記對話已讀失敗',
      error: error.message
    });
  }
});

// GET /api/messages/unread-count - 獲取未讀訊息數量
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Message.countDocuments({
      receiver: req.user.id,
      status: 'delivered'
    });

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    console.error('獲取未讀數量錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取未讀數量失敗',
      error: error.message
    });
  }
});

module.exports = router;