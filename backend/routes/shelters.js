const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const User = require('../models/User');
const Pet = require('../models/Pet');
const Adoption = require('../models/Adoption');

/**
 * @swagger
 * /api/shelters/{id}/stats:
 *   get:
 *     summary: 取得收容所統計資料
 *     tags: [Shelters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 收容所 ID
 *       - in: query
 *         name: range
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 統計天數範圍
 *     responses:
 *       200:
 *         description: 成功取得統計資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalPets:
 *                       type: integer
 *                     availablePets:
 *                       type: integer
 *                     adoptedPets:
 *                       type: integer
 *                     sponsorshipEnabled:
 *                       type: integer
 *                       description: 啟用助養的寵物數
 *                     totalSponsorshipClicks:
 *                       type: integer
 *                       description: 總助養點擊數
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 */
// Story 3.4: 收容所統計資料
router.get('/:id/stats', auth, roleCheck('shelter', 'admin'), async (req, res) => {
  try {
    const shelterId = req.params.id;
    
    // 確認是自己的收容所或管理員
    if (req.user.role === 'shelter' && req.user._id.toString() !== shelterId) {
      return res.status(403).json({
        success: false,
        error: '您只能查看自己的統計資料'
      });
    }

    const range = parseInt(req.query.range) || 30; // 預設 30 天
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    // 並行查詢統計資料
    const shelterPetIds = await Pet.find({ shelter: shelterId }).select('_id');
    const petIds = shelterPetIds.map(p => p._id);
    
    const [
      totalPets,
      availablePets,
      adoptedPets,
      pendingPets,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      monthApplications,
      successfulAdoptions,
      averageAdoptionDays,
      speciesDistribution,
      recentApplications,
      // Story 3.6: 助養統計
      sponsorshipStats,
      topSponsoredPets
    ] = await Promise.all([
      // 總寵物數
      Pet.countDocuments({ shelter: shelterId }),
      
      // 待認養寵物數
      Pet.countDocuments({ shelter: shelterId, status: 'available' }),
      
      // 已認養寵物數
      Pet.countDocuments({ shelter: shelterId, status: 'adopted' }),
      
      // 申請中寵物數
      Pet.countDocuments({ shelter: shelterId, status: 'pending' }),
      
      // 總申請數
      Adoption.countDocuments({
        pet: { $in: petIds }
      }),
      
      // 待審核申請數
      Adoption.countDocuments({
        pet: { $in: petIds },
        status: { $in: ['pending', 'under_review'] }
      }),
      
      // 已核准申請數
      Adoption.countDocuments({
        pet: { $in: petIds },
        status: 'approved'
      }),
      
      // 已拒絕申請數
      Adoption.countDocuments({
        pet: { $in: petIds },
        status: 'rejected'
      }),
      
      // 本月申請數
      Adoption.countDocuments({
        pet: { $in: petIds },
        createdAt: { $gte: startDate }
      }),
      
      // 成功認養數
      Adoption.countDocuments({
        pet: { $in: petIds },
        status: 'completed'
      }),
      
      // 平均認養天數
      Adoption.aggregate([
        {
          $lookup: {
            from: 'pets',
            localField: 'pet',
            foreignField: '_id',
            as: 'petInfo'
          }
        },
        {
          $match: {
            'petInfo.shelter': shelterId,
            status: 'completed',
            'completionInfo.adoptionDate': { $exists: true }
          }
        },
        {
          $project: {
            days: {
              $divide: [
                { $subtract: ['$completionInfo.adoptionDate', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDays: { $avg: '$days' }
          }
        }
      ]),
      
      // 物種分布
      Pet.aggregate([
        { $match: { shelter: shelterId } },
        { $group: { _id: '$species', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // 最近申請 (用於趨勢圖)
      Adoption.aggregate([
        {
          $lookup: {
            from: 'pets',
            localField: 'pet',
            foreignField: '_id',
            as: 'petInfo'
          }
        },
        {
          $match: {
            'petInfo.shelter': shelterId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      
      // Story 3.6: 助養統計
      Pet.aggregate([
        { $match: { shelter: shelterId, 'sponsorship.enabled': true } },
        {
          $group: {
            _id: null,
            totalClicks: { $sum: '$sponsorship.clickCount' },
            enabledCount: { $sum: 1 }
          }
        }
      ]),
      
      // Story 3.6: 熱門助養寵物 (Top 5)
      Pet.find({
        shelter: shelterId,
        'sponsorship.enabled': true,
        'sponsorship.clickCount': { $gt: 0 }
      })
        .sort({ 'sponsorship.clickCount': -1 })
        .limit(5)
        .select('name species sponsorship.clickCount photos')
    ]);

    // 計算核准率
    const approvalRate = totalApplications > 0 
      ? Math.round((approvedApplications / totalApplications) * 100) 
      : 0;

    // 計算平均審核時間 (小時)
    const avgReviewTime = await Adoption.aggregate([
      {
        $lookup: {
          from: 'pets',
          localField: 'pet',
          foreignField: '_id',
          as: 'petInfo'
        }
      },
      {
        $match: {
          'petInfo.shelter': shelterId,
          status: { $in: ['approved', 'rejected'] },
          updatedAt: { $exists: true }
        }
      },
      {
        $project: {
          hours: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$hours' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalPets,
          availablePets,
          adoptedPets,
          pendingPets,
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          monthApplications,
          successfulAdoptions,
          approvalRate,
          averageAdoptionDays: averageAdoptionDays[0]?.avgDays 
            ? Math.round(averageAdoptionDays[0].avgDays) 
            : 0,
          averageReviewTime: avgReviewTime[0]?.avgHours 
            ? Math.round(avgReviewTime[0].avgHours) 
            : 0,
          // Story 3.6: 助養統計
          sponsorshipEnabled: sponsorshipStats[0]?.enabledCount || 0,
          totalSponsorshipClicks: sponsorshipStats[0]?.totalClicks || 0
        },
        speciesDistribution: speciesDistribution.map(item => ({
          species: item._id,
          count: item.count
        })),
        applicationTrend: recentApplications.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          count: item.count
        })),
        // Story 3.6: 熱門助養寵物
        topSponsoredPets: topSponsoredPets || []
      }
    });
  } catch (error) {
    console.error('Get shelter stats error:', error);
    res.status(500).json({
      success: false,
      error: '取得統計資料失敗',
      details: error.message
    });
  }
});

module.exports = router;
