const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Pet = require('../models/Pet');
const Adoption = require('../models/Adoption');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Story 3.3: 使用者統計資料
router.get('/me/stats', auth, async (req, res) => {
  try {
    // 確保 req.user 存在
    if (!req.user || !req.user._id) {
      console.error('❌ req.user 不存在或缺少 _id');
      return res.status(401).json({
        success: false,
        error: '認證失敗,請重新登入'
      });
    }

    const userId = req.user._id;
    console.log('=== 獲取使用者統計資料 ===');
    console.log('使用者 ID:', userId);
    console.log('使用者:', req.user.email);

    // 計算各項統計
    // 取得使用者物件一次，用於瀏覽與收藏
    const userObj = await User.findById(userId).select('browsingHistory favorites');

    const petsViewed = userObj?.browsingHistory?.length || 0;
    const favoritesCount = userObj?.favorites?.length || 0;

    // 同步查詢：認養申請與貼文數量
    const [applicationsCount, postsCount] = await Promise.all([
      Adoption.countDocuments({ applicant: userId }),
      Post.countDocuments({ author: userId })
    ]);

    // 留言數量：計算發表於自己貼文的留言數（Comment collection）
    let commentsCount = 0;
    try {
      const userPosts = await Post.find({ author: userId }).select('_id').lean();
      const postIds = userPosts.map(p => p._id);
      if (postIds.length > 0) {
        commentsCount = await Comment.countDocuments({ post: { $in: postIds } });
      }
    } catch (e) {
      console.error('計算留言數量時發生錯誤:', e);
      commentsCount = 0;
    }

    // 計算配對檔案完成度
    const user = await User.findById(userId);
    let matchingProfileComplete = 0;
    
    if (user) {
      let completedFields = 0;
      const totalFields = 4; // recommendationProfile + 3 個新 profile

      // 檢查 recommendationProfile
      if (user.recommendationProfile && 
          user.recommendationProfile.species && 
          user.recommendationProfile.species.length > 0) {
        completedFields++;
      }

      // 檢查 lifestyleProfile
      if (user.lifestyleProfile && 
          user.lifestyleProfile.activityLevel && 
          user.lifestyleProfile.availableTime && 
          user.lifestyleProfile.housingType) {
        completedFields++;
      }

      // 檢查 experienceProfile
      if (user.experienceProfile && 
          user.experienceProfile.petOwnershipExperience) {
        completedFields++;
      }

      // 檢查 environmentProfile
      if (user.environmentProfile && 
          (user.environmentProfile.hasChildren !== undefined || 
           user.environmentProfile.hasOtherPets !== undefined)) {
        completedFields++;
      }

      matchingProfileComplete = Math.round((completedFields / totalFields) * 100);
    }

    console.log('=== 統計結果 ===');
    console.log('瀏覽寵物:', petsViewed);
    console.log('我的收藏:', favoritesCount);
    console.log('認養申請:', applicationsCount);
    console.log('社群貢獻:', postsCount + commentsCount);
    console.log('配對檔案完成度:', matchingProfileComplete);

    res.json({
      success: true,
      data: {
        petsViewed,
        favoritesCount,
        applicationsCount,
        postsCount: postsCount + commentsCount, // 合併貼文和留言
        matchingProfileComplete
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: '取得統計資料失敗'
    });
  }
});

// Story 3.3: 使用者活動時間軸
router.get('/me/activities', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;

    const activities = [];

    // 取得最近的瀏覽歷史
    const user = await User.findById(userId).populate({
      path: 'browsingHistory.pet',
      select: 'name species'
    });

    if (user && user.browsingHistory) {
      user.browsingHistory
        .slice(0, 5)
        .forEach(history => {
          if (history.pet) {
            activities.push({
              type: 'pet_view',
              description: `瀏覽了 ${history.pet.name} (${history.pet.species === 'dog' ? '狗' : '貓'})`,
              createdAt: history.viewedAt
            });
          }
        });
    }

    // 取得最近的收藏
    const recentFavorites = await Pet.find({
      _id: { $in: user?.favorites || [] }
    })
    .select('name species')
    .limit(5)
    .lean();

    recentFavorites.forEach(pet => {
      activities.push({
        type: 'favorite',
        description: `收藏了 ${pet.name}`,
        createdAt: new Date() // 簡化版，實際應該記錄收藏時間
      });
    });

    // 取得最近的認養申請
    const recentApplications = await Adoption.find({ applicant: userId })
      .populate('pet', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    recentApplications.forEach(app => {
      activities.push({
        type: 'application',
        description: `提交了 ${app.pet?.name || '某寵物'} 的認養申請`,
        createdAt: app.createdAt
      });
    });

    // 取得最近的貼文
    const recentPosts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    recentPosts.forEach(post => {
      activities.push({
        type: 'post',
        description: `發表了貼文：${post.title.substring(0, 30)}${post.title.length > 30 ? '...' : ''}`,
        createdAt: post.createdAt
      });
    });

    // 依時間排序並限制數量
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limitedActivities = activities.slice(0, limit);

    res.json({
      success: true,
      data: limitedActivities
    });
  } catch (error) {
    console.error('Get user activities error:', error);
    res.status(500).json({
      success: false,
      error: '取得活動記錄失敗'
    });
  }
});

module.exports = router;
