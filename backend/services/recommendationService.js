/**
 * Story 1.2: Rule-based Recommendation Engine
 * 規則式推薦演算法服務
 */

const Pet = require('../models/Pet');
const logger = require('../utils/logger');

/**
 * 計算寵物推薦分數
 * 評分公式:
 * - 偏好配對 (50%): 物種、體型、年齡、性格符合使用者偏好
 * - 熱門度 (30%): 按讚數、瀏覽數
 * - 新鮮度 (20%): 進入收容所天數 (越新越好)
 */
class RecommendationService {
  
  /**
   * 為使用者生成推薦寵物列表
   * @param {Object} user - 使用者物件
   * @param {Object} options - 選項 { limit, excludePetIds }
   * @returns {Array} 推薦的寵物列表，包含推薦理由
   */
  async generateRecommendations(user, options = {}) {
    const startTime = Date.now();
    const { limit = 8, excludePetIds = [] } = options;

    try {
      // 取得所有可認養的寵物
      const query = {
        adoptionStatus: 'available',
        isActive: true,
        _id: { $nin: excludePetIds }
      };

      const allPets = await Pet.find(query)
        .populate('createdBy', 'username');

      if (allPets.length === 0) {
        logger.info('推薦系統: 沒有可推薦的寵物');
        return [];
      }

      // 計算每隻寵物的推薦分數
      const scoredPets = allPets.map(pet => {
        const petObj = pet.toObject(); // 轉換為物件並包含 virtuals
        const scores = this.calculateScores(pet, user);
        const totalScore = this.calculateTotalScore(scores);
        const reasons = this.generateReasons(scores, user);

        return {
          ...petObj,
          recommendationScore: totalScore,
          scoreBreakdown: scores,
          recommendationReasons: reasons
        };
      });

      // 按分數排序並取前 N 筆
      const recommendations = scoredPets
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

      const duration = Date.now() - startTime;
      logger.info('推薦系統: 生成完成', {
        userId: user._id,
        petCount: allPets.length,
        recommendationCount: recommendations.length,
        duration: `${duration}ms`
      });

      return recommendations;

    } catch (error) {
      logger.error('推薦系統錯誤', { error: error.message, userId: user._id });
      throw error;
    }
  }

  /**
   * 計算各項分數
   * @param {Object} pet - 寵物物件
   * @param {Object} user - 使用者物件
   * @returns {Object} 分數明細
   */
  calculateScores(pet, user) {
    const profile = user.recommendationProfile || {};
    
    return {
      preferenceScore: this.calculatePreferenceScore(pet, profile),
      popularityScore: this.calculatePopularityScore(pet),
      freshnessScore: this.calculateFreshnessScore(pet)
    };
  }

  /**
   * 計算偏好配對分數 (0-100)
   * 根據物種、體型、年齡、性格等偏好計算
   */
  calculatePreferenceScore(pet, profile) {
    if (!profile || Object.keys(profile).length === 0) {
      return 0; // 無偏好資料，返回 0 分
    }

    let score = 0;
    let maxScore = 0;

    // 物種配對 (25 分)
    maxScore += 25;
    if (profile.species && profile.species.length > 0) {
      if (profile.species.includes(pet.species)) {
        score += 25;
      }
    }

    // 體型配對 (15 分)
    maxScore += 15;
    if (profile.sizes && profile.sizes.length > 0) {
      if (profile.sizes.includes(pet.size)) {
        score += 15;
      }
    }

    // 年齡配對 (10 分)
    maxScore += 10;
    if (profile.ageCategories && profile.ageCategories.length > 0) {
      if (profile.ageCategories.includes(pet.ageCategory)) {
        score += 10;
      }
    }

    // 性格配對 (30 分) - 部分符合也給分
    maxScore += 30;
    if (profile.personality && profile.personality.length > 0 && pet.personality && pet.personality.traits) {
      const matchedTraits = profile.personality.filter(trait => 
        pet.personality.traits.includes(trait)
      );
      const matchRatio = matchedTraits.length / profile.personality.length;
      score += matchRatio * 30;
    }

    // 健康狀態配對 (10 分)
    maxScore += 10;
    let healthMatches = 0;
    let healthPreferences = 0;
    if (profile.healthPreferences) {
      if (profile.healthPreferences.vaccinated) {
        healthPreferences++;
        if (pet.healthStatus && pet.healthStatus.vaccinated) healthMatches++;
      }
      if (profile.healthPreferences.spayed) {
        healthPreferences++;
        if (pet.healthStatus && pet.healthStatus.spayed) healthMatches++;
      }
      if (profile.healthPreferences.microchipped) {
        healthPreferences++;
        if (pet.healthStatus && pet.healthStatus.microchipped) healthMatches++;
      }
      if (healthPreferences > 0) {
        score += (healthMatches / healthPreferences) * 10;
      }
    }

    // 特殊需求配對 (10 分)
    maxScore += 10;
    let specialNeedsMatches = 0;
    let specialNeedsPreferences = 0;
    if (profile.specialNeeds) {
      if (profile.specialNeeds.goodWithChildren) {
        specialNeedsPreferences++;
        if (pet.personality && pet.personality.goodWith && pet.personality.goodWith.children) {
          specialNeedsMatches++;
        }
      }
      if (profile.specialNeeds.goodWithOtherPets) {
        specialNeedsPreferences++;
        if (pet.personality && pet.personality.goodWith && pet.personality.goodWith.otherPets) {
          specialNeedsMatches++;
        }
      }
      if (specialNeedsPreferences > 0) {
        score += (specialNeedsMatches / specialNeedsPreferences) * 10;
      }
    }

    // 正規化到 0-100
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  /**
   * 計算熱門度分數 (0-100)
   * 根據按讚數和瀏覽數計算
   */
  calculatePopularityScore(pet) {
    const likes = pet.likes ? pet.likes.length : 0;
    const views = pet.views || 0;

    // 使用對數縮放避免熱門寵物分數過高
    const likeScore = Math.min(Math.log(likes + 1) * 15, 50);
    const viewScore = Math.min(Math.log(views + 1) * 10, 50);

    return likeScore + viewScore;
  }

  /**
   * 計算新鮮度分數 (0-100)
   * 越新進入收容所的寵物分數越高
   */
  calculateFreshnessScore(pet) {
    if (!pet.shelterInfo || !pet.shelterInfo.intakeDate) {
      return 50; // 無日期資料，給予中間分數
    }

    const now = new Date();
    const intakeDate = new Date(pet.shelterInfo.intakeDate);
    const daysInShelter = Math.floor((now - intakeDate) / (1000 * 60 * 60 * 24));

    // 0-30 天: 100-70 分
    // 31-90 天: 70-40 分
    // 91-180 天: 40-20 分
    // 180+ 天: 20-0 分
    if (daysInShelter <= 30) {
      return 100 - (daysInShelter * 1);
    } else if (daysInShelter <= 90) {
      return 70 - ((daysInShelter - 30) * 0.5);
    } else if (daysInShelter <= 180) {
      return 40 - ((daysInShelter - 90) * 0.22);
    } else {
      return Math.max(0, 20 - ((daysInShelter - 180) * 0.1));
    }
  }

  /**
   * 計算總分 (加權平均)
   * 偏好配對 50%, 熱門度 30%, 新鮮度 20%
   */
  calculateTotalScore(scores) {
    const weights = {
      preference: 0.5,
      popularity: 0.3,
      freshness: 0.2
    };

    return (
      scores.preferenceScore * weights.preference +
      scores.popularityScore * weights.popularity +
      scores.freshnessScore * weights.freshness
    );
  }

  /**
   * 生成推薦理由
   * @param {Object} scores - 分數物件
   * @param {Object} user - 使用者物件
   * @returns {Array} 推薦理由列表
   */
  generateReasons(scores, user) {
    const reasons = [];
    const profile = user.recommendationProfile || {};

    // 偏好配對理由
    if (scores.preferenceScore >= 60) {
      const matchedPreferences = [];
      
      if (profile.species && profile.species.length > 0) {
        matchedPreferences.push('物種');
      }
      if (profile.sizes && profile.sizes.length > 0) {
        matchedPreferences.push('體型');
      }
      if (profile.personality && profile.personality.length > 0) {
        matchedPreferences.push('性格');
      }

      if (matchedPreferences.length > 0) {
        reasons.push(`符合你的偏好: ${matchedPreferences.join('、')}`);
      }
    }

    // 熱門度理由
    if (scores.popularityScore >= 60) {
      reasons.push('社群熱門推薦');
    }

    // 新鮮度理由
    if (scores.freshnessScore >= 80) {
      reasons.push('剛進入收容所');
    }

    // 無特定理由時的預設訊息
    if (reasons.length === 0) {
      reasons.push('推薦給你');
    }

    return reasons;
  }

  /**
   * 取得熱門寵物 (回退方案)
   * 當使用者沒有偏好設定時使用
   */
  async getPopularPets(options = {}) {
    const { limit = 8, excludePetIds = [] } = options;

    try {
      const pets = await Pet.find({
        adoptionStatus: 'available',
        isActive: true,
        _id: { $nin: excludePetIds }
      })
      .sort({ views: -1, 'likes.length': -1 })
      .limit(limit)
      .populate('createdBy', 'username');

      return pets.map(pet => {
        const petObj = pet.toObject(); // 轉換為物件並包含 virtuals
        return {
          ...petObj,
          recommendationReasons: ['熱門寵物']
        };
      });

    } catch (error) {
      logger.error('取得熱門寵物錯誤', { error: error.message });
      throw error;
    }
  }
}

module.exports = new RecommendationService();
