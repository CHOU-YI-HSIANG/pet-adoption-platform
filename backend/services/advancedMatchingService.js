/**
 * Story 3.2: Advanced Pet Matching Algorithm
 * 進階寵物配對演算法服務
 * 
 * 新增功能:
 * 1. 相容性評分系統 (Compatibility Score)
 * 2. 生活方式匹配 (Lifestyle Matching)
 * 3. 配對信心指數 (Match Confidence)
 * 4. 詳細配對分析報告
 * 5. 智慧建議系統
 */

const Pet = require('../models/Pet');
const User = require('../models/User');
const BrowsingHistory = require('../models/BrowsingHistory');
const logger = require('../utils/logger');

class AdvancedMatchingService {
  
  /**
   * 計算完整的配對分數和分析
   * @param {Object} pet - 寵物物件
   * @param {Object} user - 使用者物件
   * @returns {Object} 配對結果 { score, confidence, analysis, recommendations }
   */
  async calculateMatch(pet, user) {
    try {
      // 1. 基礎相容性評分
      const compatibilityScore = this.calculateCompatibility(pet, user);
      
      // 2. 生活方式匹配
      const lifestyleScore = this.calculateLifestyleMatch(pet, user);
      
      // 3. 經驗匹配
      const experienceScore = this.calculateExperienceMatch(pet, user);
      
      // 4. 環境匹配
      const environmentScore = this.calculateEnvironmentMatch(pet, user);
      
      // 5. 計算總分和信心指數
      const totalScore = this.calculateWeightedScore({
        compatibility: compatibilityScore,
        lifestyle: lifestyleScore,
        experience: experienceScore,
        environment: environmentScore
      });
      
      const confidence = this.calculateConfidence(user, {
        compatibility: compatibilityScore,
        lifestyle: lifestyleScore,
        experience: experienceScore,
        environment: environmentScore
      });
      
      // 6. 生成詳細分析
      const analysis = this.generateAnalysis({
        compatibility: compatibilityScore,
        lifestyle: lifestyleScore,
        experience: experienceScore,
        environment: environmentScore
      }, pet, user);
      
      // 7. 生成智慧建議
      const recommendations = this.generateRecommendations(totalScore, analysis, pet, user);
      
      return {
        matchScore: totalScore,
        confidence,
        breakdown: {
          compatibility: compatibilityScore,
          lifestyle: lifestyleScore,
          experience: experienceScore,
          environment: environmentScore
        },
        analysis,
        recommendations,
        matchLevel: this.getMatchLevel(totalScore)
      };
      
    } catch (error) {
      logger.error('配對計算錯誤:', error);
      throw error;
    }
  }
  
  /**
   * 計算基礎相容性評分 (0-100)
   * 基於物種、體型、年齡、性格等基本屬性
   */
  calculateCompatibility(pet, user) {
    const profile = user.recommendationProfile || {};
    let score = 0;
    let maxScore = 0;
    
    // 物種匹配 (30分)
    maxScore += 30;
    if (profile.species && profile.species.length > 0) {
      if (profile.species.includes(pet.species)) {
        score += 30;
      } else {
        // 部分相容 (例如：喜歡狗和貓，寵物是其中之一)
        score += 10;
      }
    } else {
      // 無偏好，給予中等分數
      score += 15;
      maxScore = 15;
    }
    
    // 體型匹配 (20分)
    maxScore += 20;
    if (profile.sizes && profile.sizes.length > 0) {
      if (profile.sizes.includes(pet.size)) {
        score += 20;
      } else {
        // 相鄰體型給予部分分數
        const sizeOrder = ['small', 'medium', 'large', 'extra-large'];
        const petSizeIndex = sizeOrder.indexOf(pet.size);
        const hasAdjacentSize = profile.sizes.some(preferredSize => {
          const prefIndex = sizeOrder.indexOf(preferredSize);
          return Math.abs(prefIndex - petSizeIndex) === 1;
        });
        if (hasAdjacentSize) score += 10;
      }
    } else {
      score += 10;
      maxScore = 10;
    }
    
    // 年齡匹配 (15分)
    maxScore += 15;
    if (profile.ageCategories && profile.ageCategories.length > 0) {
      if (profile.ageCategories.includes(pet.ageCategory)) {
        score += 15;
      } else {
        score += 5; // 不匹配但仍給予基礎分
      }
    } else {
      score += 7;
      maxScore = 7;
    }
    
    // 性格匹配 (35分) - 最重要的指標
    maxScore += 35;
    if (profile.personality && profile.personality.length > 0 && pet.personality && pet.personality.traits) {
      const matchedTraits = profile.personality.filter(trait => 
        pet.personality.traits.includes(trait)
      );
      const matchRatio = matchedTraits.length / profile.personality.length;
      score += matchRatio * 35;
      
      // 額外獎勵：完全匹配
      if (matchRatio === 1) {
        score += 5;
        maxScore += 5;
      }
    } else {
      score += 15;
      maxScore = 15;
    }
    
    return maxScore > 0 ? (score / maxScore) * 100 : 50;
  }
  
  /**
   * 計算生活方式匹配 (0-100)
   * 考慮活動量、照顧時間、住宅類型等
   */
  calculateLifestyleMatch(pet, user) {
    const profile = user.lifestyleProfile || {};
    let score = 0;
    let maxScore = 0;
    
    // 活動量匹配 (40分)
    maxScore += 40;
    if (profile.activityLevel && pet.careRequirements && pet.careRequirements.exerciseNeeds) {
      const activityMatch = {
        'low-low': 40,
        'low-medium': 20,
        'low-high': 0,
        'medium-low': 20,
        'medium-medium': 40,
        'medium-high': 30,
        'high-low': 10,
        'high-medium': 30,
        'high-high': 40
      };
      const key = `${profile.activityLevel}-${pet.careRequirements.exerciseNeeds}`;
      score += activityMatch[key] || 20;
    } else {
      score += 20;
    }
    
    // 可用時間匹配 (30分)
    maxScore += 30;
    if (profile.availableTime && pet.careRequirements && pet.careRequirements.timeCommitment) {
      const timeMatch = {
        'minimal-low': 30,
        'minimal-medium': 15,
        'minimal-high': 5,
        'moderate-low': 25,
        'moderate-medium': 30,
        'moderate-high': 20,
        'extensive-low': 20,
        'extensive-medium': 25,
        'extensive-high': 30
      };
      const key = `${profile.availableTime}-${pet.careRequirements.timeCommitment}`;
      score += timeMatch[key] || 15;
    } else {
      score += 15;
    }
    
    // 住宅類型匹配 (30分)
    maxScore += 30;
    if (profile.housingType) {
      // 大型犬需要較大空間
      if (pet.size === 'large' || pet.size === 'extra-large') {
        const housingScore = {
          'apartment': 10,
          'condo': 15,
          'townhouse': 20,
          'house-no-yard': 20,
          'house-with-yard': 30
        };
        score += housingScore[profile.housingType] || 15;
      } else {
        // 小型寵物對住宅要求較低
        score += 25;
      }
    } else {
      score += 15;
    }
    
    return maxScore > 0 ? (score / maxScore) * 100 : 50;
  }
  
  /**
   * 計算經驗匹配 (0-100)
   * 考慮使用者養寵物經驗與寵物的照顧難度
   */
  calculateExperienceMatch(pet, user) {
    const profile = user.experienceProfile || {};
    let score = 0;
    let maxScore = 100;
    
    const experienceLevel = profile.petOwnershipExperience || 'none';
    const careLevel = pet.careRequirements?.careLevel || 'medium';
    
    // 經驗與照顧難度匹配矩陣
    const matchMatrix = {
      'none-easy': 100,
      'none-medium': 60,
      'none-high': 30,
      'beginner-easy': 90,
      'beginner-medium': 80,
      'beginner-high': 50,
      'intermediate-easy': 85,
      'intermediate-medium': 95,
      'intermediate-high': 75,
      'experienced-easy': 80,
      'experienced-medium': 90,
      'experienced-high': 100
    };
    
    const key = `${experienceLevel}-${careLevel}`;
    score = matchMatrix[key] || 50;
    
    // 特殊需求調整
    if (pet.specialNeeds && pet.specialNeeds.length > 0) {
      if (experienceLevel === 'experienced') {
        score = Math.min(100, score + 10); // 有經驗者獎勵
      } else if (experienceLevel === 'none' || experienceLevel === 'beginner') {
        score = Math.max(0, score - 20); // 新手扣分
      }
    }
    
    return score;
  }
  
  /**
   * 計算環境匹配 (0-100)
   * 考慮家中其他寵物、小孩等因素
   */
  calculateEnvironmentMatch(pet, user) {
    const profile = user.environmentProfile || {};
    let score = 100; // 從滿分開始扣分
    let deductions = 0;
    
    // 檢查是否與小孩相容
    if (profile.hasChildren) {
      if (pet.personality && pet.personality.goodWith && pet.personality.goodWith.children === false) {
        deductions += 40; // 不適合小孩環境，重大扣分
      } else if (pet.personality && pet.personality.goodWith && pet.personality.goodWith.children === true) {
        // 適合小孩，不扣分且給予獎勵
        score += 10;
      } else {
        deductions += 10; // 未知狀況，小幅扣分
      }
    }
    
    // 檢查是否與其他寵物相容
    if (profile.hasOtherPets) {
      if (pet.personality && pet.personality.goodWith && pet.personality.goodWith.otherPets === false) {
        deductions += 40;
      } else if (pet.personality && pet.personality.goodWith && pet.personality.goodWith.otherPets === true) {
        score += 10;
      } else {
        deductions += 10;
      }
    }
    
    // 噪音容忍度
    if (profile.noiseSensitive && pet.personality && pet.personality.traits) {
      if (pet.personality.traits.includes('vocal') || pet.personality.traits.includes('energetic')) {
        deductions += 15;
      }
    }
    
    // 過敏考量
    if (profile.hasAllergies) {
      if (pet.species === 'cat' || (pet.breed && pet.breed.includes('long-hair'))) {
        deductions += 25;
      }
    }
    
    return Math.max(0, Math.min(110, score - deductions));
  }
  
  /**
   * 計算加權總分
   */
  calculateWeightedScore(scores) {
    const weights = {
      compatibility: 0.35,    // 35%
      lifestyle: 0.30,        // 30%
      experience: 0.20,       // 20%
      environment: 0.15       // 15%
    };
    
    return (
      scores.compatibility * weights.compatibility +
      scores.lifestyle * weights.lifestyle +
      scores.experience * weights.experience +
      scores.environment * weights.environment
    );
  }
  
  /**
   * 計算配對信心指數 (0-100)
   * 基於使用者資料完整度和配對分數一致性
   */
  calculateConfidence(user, scores) {
    let confidence = 0;
    let factors = 0;
    
    // 資料完整度評分
    const profile = user.recommendationProfile || {};
    const lifestyleProfile = user.lifestyleProfile || {};
    const experienceProfile = user.experienceProfile || {};
    const environmentProfile = user.environmentProfile || {};
    
    // 檢查各項資料是否完整
    if (profile.species && profile.species.length > 0) {
      confidence += 15;
      factors++;
    }
    if (profile.personality && profile.personality.length > 0) {
      confidence += 15;
      factors++;
    }
    if (lifestyleProfile.activityLevel) {
      confidence += 15;
      factors++;
    }
    if (experienceProfile.petOwnershipExperience) {
      confidence += 15;
      factors++;
    }
    if (environmentProfile.hasChildren !== undefined || environmentProfile.hasOtherPets !== undefined) {
      confidence += 10;
      factors++;
    }
    
    // 分數一致性 (各項分數接近表示配對較穩定)
    const scoreValues = Object.values(scores);
    const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    const variance = scoreValues.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scoreValues.length;
    const consistency = Math.max(0, 100 - variance / 10);
    
    confidence += consistency * 0.3;
    
    return Math.min(100, confidence);
  }
  
  /**
   * 生成詳細配對分析
   */
  generateAnalysis(scores, pet, user) {
    const analysis = {
      strengths: [],
      concerns: [],
      highlights: []
    };
    
    // 優勢分析
    if (scores.compatibility >= 80) {
      analysis.strengths.push('基本屬性高度相容');
    }
    if (scores.lifestyle >= 80) {
      analysis.strengths.push('生活方式非常匹配');
    }
    if (scores.experience >= 80) {
      analysis.strengths.push('您的經驗適合照顧這隻寵物');
    }
    if (scores.environment >= 80) {
      analysis.strengths.push('家庭環境理想');
    }
    
    // 顧慮分析
    if (scores.compatibility < 60) {
      analysis.concerns.push('基本偏好匹配度較低，建議考慮其他選項');
    }
    if (scores.lifestyle < 60) {
      analysis.concerns.push('生活方式可能需要調整以適應寵物需求');
    }
    if (scores.experience < 50) {
      analysis.concerns.push('這隻寵物可能需要較多照顧經驗');
    }
    if (scores.environment < 60) {
      analysis.concerns.push('家庭環境可能需要改善以適合寵物');
    }
    
    // 特色亮點
    const profile = user.recommendationProfile || {};
    if (profile.species && profile.species.includes(pet.species)) {
      analysis.highlights.push(`符合您偏好的 ${pet.species} 品種`);
    }
    if (pet.personality && pet.personality.traits) {
      const matchedTraits = (profile.personality || []).filter(trait => 
        pet.personality.traits.includes(trait)
      );
      if (matchedTraits.length > 0) {
        analysis.highlights.push(`性格特質匹配: ${matchedTraits.join('、')}`);
      }
    }
    
    return analysis;
  }
  
  /**
   * 生成智慧建議
   */
  generateRecommendations(totalScore, analysis, pet, user) {
    const recommendations = [];
    
    if (totalScore >= 80) {
      recommendations.push({
        type: 'positive',
        title: '極佳配對',
        message: `${pet.name} 非常適合您！建議盡快提交認養申請。`,
        action: 'apply',
        priority: 'high'
      });
    } else if (totalScore >= 60) {
      recommendations.push({
        type: 'neutral',
        title: '良好配對',
        message: `${pet.name} 適合您，建議先了解更多照顧細節。`,
        action: 'learn_more',
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'caution',
        title: '需要考慮',
        message: `${pet.name} 可能需要特別的照顧，建議諮詢專業意見。`,
        action: 'consult',
        priority: 'low'
      });
    }
    
    // 基於分析給予具體建議
    if (analysis.concerns.length > 0) {
      analysis.concerns.forEach(concern => {
        if (concern.includes('經驗')) {
          recommendations.push({
            type: 'tip',
            title: '建議參加培訓',
            message: '考慮參加寵物照顧培訓課程以提升經驗',
            action: 'training',
            priority: 'medium'
          });
        }
        if (concern.includes('環境')) {
          recommendations.push({
            type: 'tip',
            title: '環境準備',
            message: '建議在認養前改善家庭環境設施',
            action: 'prepare',
            priority: 'high'
          });
        }
      });
    }
    
    return recommendations;
  }
  
  /**
   * 取得配對等級
   */
  getMatchLevel(score) {
    if (score >= 85) return { level: 'perfect', label: '完美配對', color: 'green' };
    if (score >= 70) return { level: 'excellent', label: '絕佳配對', color: 'blue' };
    if (score >= 55) return { level: 'good', label: '良好配對', color: 'teal' };
    if (score >= 40) return { level: 'fair', label: '尚可配對', color: 'yellow' };
    return { level: 'poor', label: '配對度低', color: 'red' };
  }
  
  /**
   * 批次計算配對分數
   * @param {Array} pets - 寵物列表
   * @param {Object} user - 使用者物件
   * @returns {Array} 配對結果列表
   */
  async batchCalculateMatches(pets, user) {
    const results = await Promise.all(
      pets.map(async (pet) => {
        const match = await this.calculateMatch(pet, user);
        return {
          pet,
          ...match
        };
      })
    );
    
    // 按配對分數排序
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  /**
   * 尋找最佳配對
   * @param {Object} user - 使用者物件
   * @param {Object} options - 選項
   * @returns {Array} 最佳配對列表
   */
  async findBestMatches(user, options = {}) {
    const { limit = 10, minScore = 40 } = options;
    
    try {
      // 取得所有可認養的寵物
      const availablePets = await Pet.find({
        adoptionStatus: 'available',
        isActive: true
      }).lean();
      
      if (availablePets.length === 0) {
        return [];
      }
      
      // 計算配對分數
      const matches = await this.batchCalculateMatches(availablePets, user);
      
      // 篩選並限制數量
      return matches
        .filter(match => match.matchScore >= minScore)
        .slice(0, limit);
        
    } catch (error) {
      logger.error('尋找最佳配對錯誤:', error);
      throw error;
    }
  }
}

module.exports = new AdvancedMatchingService();
