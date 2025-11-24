const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  commentCreateSchema,
  idParamSchema,
  reportSchema
} = require('../utils/validators');

/**
 * @swagger
 * /api/comments/post/{postId}:
 *   get:
 *     summary: 取得貼文的留言列表
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 貼文 ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功取得留言列表
 *       404:
 *         description: 貼文不存在
 */
// GET /api/comments/post/:postId - 獲取文章的評論
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt' } = req.query;

    // 檢查文章是否存在
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的文章'
      });
    }

    const comments = await Comment.getByPost(postId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      includeReplies: false
    });

    const total = await Comment.countDocuments({
      post: postId,
      status: 'approved',
      parentComment: null
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('獲取評論錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取評論失敗',
      error: error.message
    });
  }
});

// GET /api/comments/:id/replies - 獲取評論的回覆
router.get('/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const replies = await Comment.find({
      parentComment: id,
      status: 'approved'
    })
      .populate('author', 'username firstName lastName avatar_url')
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Comment.countDocuments({
      parentComment: id,
      status: 'approved'
    });

    res.json({
      success: true,
      data: {
        replies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('獲取回覆錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取回覆失敗',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: 建立新留言
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - post
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *               post:
 *                 type: string
 *                 description: 貼文 ID
 *     responses:
 *       201:
 *         description: 留言建立成功
 *       401:
 *         description: 未授權
 *       404:
 *         description: 貼文不存在
 */
// POST /api/comments - 建立新評論
router.post('/', auth, validateBody(commentCreateSchema), async (req, res) => {
  try {
    const { content, post } = req.body;

    console.log('=== 建立留言 ===');
    console.log('貼文 ID:', post);
    console.log('使用者 ID:', req.user._id);
    console.log('留言內容長度:', content?.length);

    // 檢查文章是否存在且允許評論
    const postDoc = await Post.findById(post);
    if (!postDoc) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的文章'
      });
    }

    if (!postDoc.allowComments) {
      return res.status(403).json({
        success: false,
        message: '此文章不允許評論'
      });
    }

    const comment = new Comment({
      content,
      post,
      author: req.user._id,
      ipAddress: req.ip
    });

    console.log('準備儲存留言...');
    await comment.save();
    console.log('✅ 留言已儲存:', comment._id);
    
    console.log('準備 populate author...');
    await comment.populate('author', 'username firstName lastName avatar_url');
    console.log('✅ Author populated');

    // 更新文章評論數量
    console.log('準備更新貼文留言數...');
    await postDoc.updateCommentCount();
    console.log('✅ 貼文留言數已更新');

    // 發送通知給貼文作者（如果不是自己的貼文）
    if (postDoc.author.toString() !== req.user._id.toString()) {
      try {
        await Notification.createNotification({
          recipient: postDoc.author,
          sender: req.user._id,
          type: 'comment',
          title: '新留言通知',
          content: `${req.user.username || req.user.firstName} 留言了您的貼文`,
          relatedPost: post,
          relatedComment: comment._id,
          link: `/community/${post}`,
          priority: 'normal'
        });
      } catch (notifError) {
        console.error('發送評論通知失敗:', notifError);
        // 不影響主流程
      }
    }

    res.status(201).json({
      success: true,
      message: '評論發布成功',
      data: comment
    });
  } catch (error) {
    console.error('建立評論錯誤:', error);
    res.status(500).json({
      success: false,
      message: '發布評論失敗',
      error: error.message
    });
  }
});

// POST /api/comments/:id/reply - 回覆評論
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const { id: parentCommentId } = req.params;

    console.log('=== 回覆留言 ===');
    console.log('父留言 ID:', parentCommentId);
    console.log('使用者 ID:', req.user._id);
    console.log('回覆內容:', content);

    // 驗證內容
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '回覆內容不能為空'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: '回覆內容不能超過 1000 個字元'
      });
    }

    // 檢查父評論是否存在
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的評論'
      });
    }

    // 檢查文章是否允許評論
    const post = await Post.findById(parentComment.post);
    if (!post || !post.allowComments) {
      return res.status(403).json({
        success: false,
        message: '此文章不允許評論'
      });
    }

    const reply = new Comment({
      content,
      post: parentComment.post,
      author: req.user._id,
      parentComment: parentCommentId,
      ipAddress: req.ip
    });

    console.log('準備儲存回覆...');
    await reply.save();
    console.log('✅ 回覆已儲存:', reply._id);
    
    console.log('準備 populate author...');
    await reply.populate('author', 'username firstName lastName avatar_url');
    console.log('✅ Author populated');

    // 更新父評論的回覆列表
    console.log('準備更新父留言的回覆列表...');
    await parentComment.addReply(reply._id);
    console.log('✅ 父留言已更新');

    // 更新文章評論數量
    console.log('準備更新貼文留言數...');
    await post.updateCommentCount();
    console.log('✅ 貼文留言數已更新');

    // 發送通知給父留言作者（如果不是自己）
    if (parentComment.author.toString() !== req.user._id.toString()) {
      try {
        await Notification.createNotification({
          recipient: parentComment.author,
          sender: req.user._id,
          type: 'reply',
          title: '新回覆通知',
          content: `${req.user.username || req.user.firstName} 回覆了您的留言`,
          relatedPost: parentComment.post,
          relatedComment: reply._id,
          link: `/community/${parentComment.post}`,
          priority: 'normal'
        });
      } catch (notifError) {
        console.error('發送回覆通知失敗:', notifError);
        // 不影響主流程
      }
    }

    res.status(201).json({
      success: true,
      message: '回覆發布成功',
      data: reply
    });
  } catch (error) {
    console.error('❌ 回覆評論錯誤:', error);
    console.error('錯誤堆疊:', error.stack);
    res.status(500).json({
      success: false,
      message: '發布回覆失敗',
      error: error.message
    });
  }
});

// PUT /api/comments/:id - 編輯評論
router.put('/:id', auth, validateBody(commentCreateSchema), async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的評論'
      });
    }

    // 檢查權限
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '沒有權限修改此評論'
      });
    }

    // 檢查是否在可編輯時間內（例如：發布後 15 分鐘內可編輯）
    const editTimeLimit = 15 * 60 * 1000; // 15 分鐘
    if (Date.now() - comment.createdAt.getTime() > editTimeLimit) {
      return res.status(403).json({
        success: false,
        message: '評論發布超過 15 分鐘後無法編輯'
      });
    }

    comment.content = content;
    await comment.save();
    await comment.populate('author', 'username firstName lastName avatar_url');

    res.json({
      success: true,
      message: '評論編輯成功',
      data: comment
    });
  } catch (error) {
    console.error('編輯評論錯誤:', error);
    res.status(500).json({
      success: false,
      message: '編輯評論失敗',
      error: error.message
    });
  }
});

// DELETE /api/comments/:id - 刪除評論
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的評論'
      });
    }

    // 檢查權限
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '沒有權限刪除此評論'
      });
    }

    // 軟刪除
    comment.status = 'hidden';
    await comment.save();

    // 更新文章評論數量
    const post = await Post.findById(comment.post);
    if (post) {
      await post.updateCommentCount();
    }

    res.json({
      success: true,
      message: '評論已刪除'
    });
  } catch (error) {
    console.error('刪除評論錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除評論失敗',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/comments/{id}/like:
 *   post:
 *     summary: 喜愛/取消喜愛留言
 *     tags: [Comments]
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
 *       401:
 *         description: 未授權
 *       404:
 *         description: 留言不存在
 */
// POST /api/comments/:id/like - 喜愛/取消喜愛評論
router.post('/:id/like', auth, async (req, res) => {
  try {
    console.log('=== 留言按讚 ===');
    console.log('留言 ID:', req.params.id);
    console.log('使用者 ID:', req.user._id);
    
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的評論'
      });
    }

    await comment.toggleLike(req.user._id);
    console.log('✅ 留言按讚操作完成');

    // 如果是按讚（不是取消），發送通知給評論作者
    const isLiked = comment.likedBy.some(id => id.toString() === req.user._id.toString());
    if (isLiked && comment.author.toString() !== req.user._id.toString()) {
      try {
        await Notification.createNotification({
          recipient: comment.author,
          sender: req.user._id,
          type: 'like',
          title: '按讚通知',
          content: `${req.user.username || req.user.firstName} 喜歡您的留言`,
          relatedComment: comment._id,
          relatedPost: comment.post,
          link: `/community/${comment.post}`,
          priority: 'low'
        });
      } catch (notifError) {
        console.error('發送按讚通知失敗:', notifError);
        // 不影響主流程
      }
    }

    res.json({
      success: true,
      message: '操作成功',
      data: {
        liked: comment.likedBy.some(id => id.toString() === req.user._id.toString()),
        likesCount: comment.likes
      }
    });
  } catch (error) {
    console.error('❌ 喜愛評論錯誤:', error);
    console.error('錯誤堆疊:', error.stack);
    res.status(500).json({
      success: false,
      message: '操作失敗',
      error: error.message
    });
  }
});

// POST /api/comments/:id/report - 檢舉評論
router.post('/:id/report', auth, validateBody(reportSchema), async (req, res) => {
  try {
    const { reason, description } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的評論'
      });
    }

    // 檢查是否已檢舉過
    const existingReport = comment.reports.find(
      report => report.reporter.toString() === req.user.id
    );

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: '您已經檢舉過此評論'
      });
    }

    await comment.report(req.user.id, reason, description);

    res.json({
      success: true,
      message: '檢舉已提交，我們會盡快處理'
    });
  } catch (error) {
    console.error('檢舉評論錯誤:', error);
    res.status(500).json({
      success: false,
      message: '檢舉失敗',
      error: error.message
    });
  }
});

// GET /api/comments/user/:userId - 獲取用戶的評論
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await Comment.getByUser(userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await Comment.countDocuments({
      author: userId,
      status: { $in: ['approved', 'pending'] }
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('獲取用戶評論錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取用戶評論失敗',
      error: error.message
    });
  }
});

module.exports = router;