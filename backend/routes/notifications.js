const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: 取得通知列表
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
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
 *           default: 20
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: 只顯示未讀通知
 *     responses:
 *       200:
 *         description: 成功取得通知列表
 *       401:
 *         description: 未授權
 */
// GET /api/notifications - 獲取通知列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const notifications = await Notification.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    const total = await Notification.countDocuments({
      recipient: req.user.id,
      ...(unreadOnly === 'true' && { isRead: false })
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('獲取通知列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取通知列表失敗',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: 取得未讀通知數量
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功取得未讀數量
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *       401:
 *         description: 未授權
 */
// GET /api/notifications/unread-count - 獲取未讀數量
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: {
        count
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

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   post:
 *     summary: 標記通知為已讀
 *     tags: [Notifications]
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
 *         description: 標記成功
 *       401:
 *         description: 未授權
 *       404:
 *         description: 通知不存在
 */
// POST /api/notifications/:id/read - 標記通知為已讀
router.post('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的通知'
      });
    }

    // 檢查權限
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '沒有權限操作此通知'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: '通知已標記為已讀',
      data: notification
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

// POST /api/notifications/read-all - 標記所有通知為已讀
router.post('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: '所有通知已標記為已讀',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('標記所有已讀錯誤:', error);
    res.status(500).json({
      success: false,
      message: '標記所有已讀失敗',
      error: error.message
    });
  }
});

// DELETE /api/notifications/:id - 刪除通知
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的通知'
      });
    }

    // 檢查權限
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '沒有權限刪除此通知'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: '通知已刪除'
    });
  } catch (error) {
    console.error('刪除通知錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除通知失敗',
      error: error.message
    });
  }
});

// DELETE /api/notifications - 刪除所有已讀通知
router.delete('/', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user.id,
      isRead: true
    });

    res.json({
      success: true,
      message: '已刪除所有已讀通知',
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('刪除已讀通知錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除已讀通知失敗',
      error: error.message
    });
  }
});

module.exports = router;
