/**
 * Story 3.2: Advanced Matching Algorithm API Routes
 * 進階配對演算法 API 路由
 */

const express = require('express');
const router = express.Router();
const advancedMatchingService = require('../services/advancedMatchingService');
const Pet = require('../models/Pet');
const User = require('../models/User');
const logger = require('../utils/logger');
const { auth } = require('../middleware/auth');

/**
 * @swagger
 * /api/matching/analyze/{petId}:
 *   get:
 *     summary: 分析寵物與使用者的配對度
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *         description: 寵物 ID
 *     responses:
 *       200:
 *         description: 成功取得配對分析
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overallScore:
 *                       type: number
 *                       description: 總配對分數 (0-100)
 *                     matchLevel:
 *                       type: string
 *                       enum: [excellent, good, fair, poor]
 *       401:
 *         description: 未授權
 *       404:
 *         description: 寵物或使用者不存在
 */
/**
 * GET /api/matching/analyze/:petId
 * 分析特定寵物與使用者的配對度
 * @auth Required
 */
router.get('/analyze/:petId', auth, async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user.id;

    // 取得寵物資料
    const pet = await Pet.findById(petId).lean();
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的寵物'
      });
    }

    // 取得使用者完整資料
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者資料'
      });
    }

    // 計算配對分析
    const matchResult = await advancedMatchingService.calculateMatch(pet, user);

    res.json({
      success: true,
      data: {
        pet: {
          _id: pet._id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          photos: pet.photos
        },
        ...matchResult
      }
    });

  } catch (error) {
    logger.error('配對分析錯誤:', error);
    res.status(500).json({
      success: false,
      message: '配對分析失敗',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/matching/best-matches:
 *   get:
 *     summary: 取得最佳配對寵物列表
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 回傳數量
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: integer
 *           default: 40
 *         description: 最低配對分數
 *     responses:
 *       200:
 *         description: 成功取得配對列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     matches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           pet:
 *                             $ref: '#/components/schemas/Pet'
 *                           matchScore:
 *                             type: number
 *                           matchLevel:
 *                             type: string
 *       401:
 *         description: 未授權
 *       404:
 *         description: 找不到使用者資料
 */
/**
 * GET /api/matching/best-matches
 * 取得最佳配對列表
 * @auth Required
 */
router.get('/best-matches', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, minScore = 40 } = req.query;

    // 取得使用者完整資料
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者資料'
      });
    }

    // 檢查使用者是否有設定檔案
    const hasProfiles = (
      (user.recommendationProfile && Object.keys(user.recommendationProfile).length > 0) ||
      (user.lifestyleProfile && Object.keys(user.lifestyleProfile).length > 0) ||
      (user.experienceProfile && Object.keys(user.experienceProfile).length > 0) ||
      (user.environmentProfile && Object.keys(user.environmentProfile).length > 0)
    );

    if (!hasProfiles) {
      return res.json({
        success: true,
        message: '請先完成個人檔案設定以獲得更精準的配對結果',
        data: {
          matches: [],
          hasProfiles: false
        }
      });
    }

    // 尋找最佳配對
    const matches = await advancedMatchingService.findBestMatches(user, {
      limit: parseInt(limit),
      minScore: parseInt(minScore)
    });

    res.json({
      success: true,
      data: {
        matches,
        hasProfiles: true,
        count: matches.length
      }
    });

  } catch (error) {
    logger.error('尋找最佳配對錯誤:', error);
    res.status(500).json({
      success: false,
      message: '尋找最佳配對失敗',
      error: error.message
    });
  }
});

/**
 * POST /api/matching/batch-analyze
 * 批次分析多隻寵物的配對度
 * @auth Required
 */
router.post('/batch-analyze', auth, async (req, res) => {
  try {
    const { petIds } = req.body;
    const userId = req.user.id;

    if (!petIds || !Array.isArray(petIds) || petIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請提供寵物 ID 列表'
      });
    }

    // 取得寵物列表
    const pets = await Pet.find({
      _id: { $in: petIds },
      adoptionStatus: 'available',
      isActive: true
    }).lean();

    if (pets.length === 0) {
      return res.json({
        success: true,
        data: {
          matches: []
        }
      });
    }

    // 取得使用者完整資料
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者資料'
      });
    }

    // 批次計算配對
    const matches = await advancedMatchingService.batchCalculateMatches(pets, user);

    res.json({
      success: true,
      data: {
        matches,
        count: matches.length
      }
    });

  } catch (error) {
    logger.error('批次配對分析錯誤:', error);
    res.status(500).json({
      success: false,
      message: '批次配對分析失敗',
      error: error.message
    });
  }
});

/**
 * PUT /api/matching/profile/lifestyle
 * 更新生活方式檔案
 * @auth Required
 */
router.put('/profile/lifestyle', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { activityLevel, availableTime, housingType } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者'
      });
    }

    // 更新生活方式檔案
    user.lifestyleProfile = {
      activityLevel,
      availableTime,
      housingType,
      lastUpdated: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: '生活方式檔案更新成功',
      data: {
        lifestyleProfile: user.lifestyleProfile
      }
    });

  } catch (error) {
    logger.error('更新生活方式檔案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新失敗',
      error: error.message
    });
  }
});

/**
 * PUT /api/matching/profile/experience
 * 更新經驗檔案
 * @auth Required
 */
router.put('/profile/experience', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { petOwnershipExperience, previousPets, trainingExperience } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者'
      });
    }

    // 更新經驗檔案
    user.experienceProfile = {
      petOwnershipExperience,
      previousPets: previousPets || [],
      trainingExperience: trainingExperience || false,
      lastUpdated: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: '經驗檔案更新成功',
      data: {
        experienceProfile: user.experienceProfile
      }
    });

  } catch (error) {
    logger.error('更新經驗檔案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新失敗',
      error: error.message
    });
  }
});

/**
 * PUT /api/matching/profile/environment
 * 更新環境檔案
 * @auth Required
 */
router.put('/profile/environment', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { hasChildren, childrenAges, hasOtherPets, otherPets, noiseSensitive, hasAllergies } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者'
      });
    }

    // 更新環境檔案
    user.environmentProfile = {
      hasChildren: hasChildren || false,
      childrenAges: childrenAges || [],
      hasOtherPets: hasOtherPets || false,
      otherPets: otherPets || [],
      noiseSensitive: noiseSensitive || false,
      hasAllergies: hasAllergies || false,
      lastUpdated: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: '環境檔案更新成功',
      data: {
        environmentProfile: user.environmentProfile
      }
    });

  } catch (error) {
    logger.error('更新環境檔案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新失敗',
      error: error.message
    });
  }
});

/**
 * GET /api/matching/profile
 * 取得所有配對檔案
 * @auth Required
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select('recommendationProfile lifestyleProfile experienceProfile environmentProfile')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到使用者'
      });
    }

    res.json({
      success: true,
      data: {
        recommendationProfile: user.recommendationProfile || {},
        lifestyleProfile: user.lifestyleProfile || {},
        experienceProfile: user.experienceProfile || {},
        environmentProfile: user.environmentProfile || {}
      }
    });

  } catch (error) {
    logger.error('取得配對檔案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得配對檔案失敗',
      error: error.message
    });
  }
});

module.exports = router;
