/**
 * Story 1.2: Recommendation API Routes
 * 推薦系統 API 路由
 */

const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const User = require('../models/User');
const logger = require('../utils/logger');
const { auth: authMiddleware } = require('../middleware/auth');

// 記憶體快取 (簡易版，1 小時 TTL)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 小時

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: 取得個人化推薦寵物
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *         description: 推薦數量
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 強制重新計算推薦
 *     responses:
 *       200:
 *         description: 成功取得推薦列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pet'
 *                 fromCache:
 *                   type: boolean
 *       401:
 *         description: 未授權
 */
/**
 * GET /api/recommendations
 * 取得個人化推薦寵物
 * @auth Required
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 8, refresh = 'false' } = req.query;
    const cacheKey = `recommendations:${userId}:${limit}`;

    // 檢查快取 (除非使用者要求重新整理)
    if (refresh !== 'true') {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        logger.info('推薦系統: 返回快取結果', { userId, cacheAge: Date.now() - cached.timestamp });
        return res.json({
          recommendations: cached.data,
          fromCache: true,
          cacheAge: Date.now() - cached.timestamp
        });
      }
    }

    // 取得使用者完整資料
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    // 檢查使用者是否有設定偏好
    const hasPreferences = user.recommendationProfile && (
      (user.recommendationProfile.species && user.recommendationProfile.species.length > 0) ||
      (user.recommendationProfile.sizes && user.recommendationProfile.sizes.length > 0) ||
      (user.recommendationProfile.personality && user.recommendationProfile.personality.length > 0)
    );

    let recommendations;

    if (hasPreferences) {
      // 使用推薦演算法
      recommendations = await recommendationService.generateRecommendations(user, {
        limit: parseInt(limit)
      });
    } else {
      // 回退方案: 返回熱門寵物
      recommendations = await recommendationService.getPopularPets({
        limit: parseInt(limit)
      });
    }

    // 儲存至快取
    cache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now()
    });

    // 清理過期快取
    cleanExpiredCache();

    res.json({
      recommendations,
      fromCache: false,
      hasPreferences,
      count: recommendations.length
    });

  } catch (error) {
    logger.error('取得推薦失敗', { error: error.message, user: req.user });
    res.status(500).json({ 
      error: '無法取得推薦',
      details: error.message 
    });
  }
});

/**
 * POST /api/recommendations/refresh
 * 清除快取並重新生成推薦
 * @auth Required
 */
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 清除該使用者的所有快取
    for (const key of cache.keys()) {
      if (key.startsWith(`recommendations:${userId}:`)) {
        cache.delete(key);
      }
    }

    logger.info('推薦快取已清除', { userId });

    res.json({ 
      message: '推薦已重新整理',
      cleared: true 
    });

  } catch (error) {
    logger.error('清除推薦快取失敗', { error: error.message, user: req.user });
    res.status(500).json({ 
      error: '無法重新整理推薦',
      details: error.message 
    });
  }
});

/**
 * 清理過期快取
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// 定期清理快取 (每 10 分鐘)
setInterval(cleanExpiredCache, 10 * 60 * 1000);

module.exports = router;
