const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Pet = require('../models/Pet');
const logger = require('../utils/logger');
const { auth: authMiddleware } = require('../middleware/auth');

/**
 * POST /api/browsing-history
 * 記錄寵物瀏覽事件
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { petId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!petId) {
      return res.status(400).json({ error: '缺少寵物 ID' });
    }

    // 使用 findByIdAndUpdate 避免版本衝突
    // 先移除舊的瀏覽記錄（如果存在）
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: { browsingHistory: { pet: petId } }
      }
    );

    // 再將新的瀏覽記錄加到最前面
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          browsingHistory: {
            $each: [{ pet: petId, viewedAt: new Date() }],
            $position: 0,
            $slice: 50 // 保留最新的 50 筆
          }
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    logger.info('瀏覽歷史已記錄', { userId, petId });

    res.json({ message: '瀏覽歷史已記錄', success: true });
  } catch (error) {
    logger.error('記錄瀏覽歷史失敗', { error: error.message });
    res.status(500).json({ error: '無法記錄瀏覽歷史', details: error.message });
  }
});

/**
 * @swagger
 * /api/browsing-history:
 *   get:
 *     summary: 取得使用者瀏覽歷史
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 回傳數量
 *     responses:
 *       200:
 *         description: 成功取得瀏覽歷史
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       pet:
 *                         $ref: '#/components/schemas/Pet'
 *                       viewedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 未授權
 *       404:
 *         description: 使用者不存在
 */
/**
 * GET /api/browsing-history
 * 取得使用者瀏覽歷史
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { limit = 20 } = req.query;

    const user = await User.findById(userId)
      .populate({
        path: 'browsingHistory.pet',
        select: 'name breed species age gender size photos shelterInfo adoptionStatus'
      })
      .lean();

    if (!user) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    const history = user.browsingHistory
      .filter(item => item.pet && item.pet.adoptionStatus === 'available')
      .slice(0, parseInt(limit))
      .map(item => ({
        ...item.pet,
        viewedAt: item.viewedAt
      }));

    res.json({ history, count: history.length });
  } catch (error) {
    logger.error('取得瀏覽歷史失敗', { error: error.message });
    res.status(500).json({ error: '無法取得瀏覽歷史', details: error.message });
  }
});

/**
 * DELETE /api/browsing-history
 * 清除瀏覽歷史
 */
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    await User.findByIdAndUpdate(userId, {
      browsingHistory: []
    });

    logger.info('瀏覽歷史已清除', { userId });

    res.json({ message: '瀏覽歷史已清除', success: true });
  } catch (error) {
    logger.error('清除瀏覽歷史失敗', { error: error.message });
    res.status(500).json({ error: '無法清除瀏覽歷史', details: error.message });
  }
});

module.exports = router;
