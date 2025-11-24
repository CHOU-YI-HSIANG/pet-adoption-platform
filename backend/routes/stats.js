const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const Adoption = require('../models/Adoption');

// 公共首頁統計資料
router.get('/', async (req, res) => {
  try {
    // 1) 待認養寵物數量（目前仍在尋找家的）
    const available = await Pet.countDocuments({ adoptionStatus: 'available', isActive: true });

    // 2) 成功配對數量：計算所有最終為審核通過或已完成的申請
    const adopted = await Adoption.countDocuments({ status: { $in: ['approved', 'completed'] } });

    // 3) 愛心家庭：使用「已匯入政府資料」的特定寵物頁數量（govData.animalId 存在）
    const importedPets = await Pet.countDocuments({ 'govData.animalId': { $exists: true, $ne: null }, isActive: true });

    // 4) 動物種類：目前刊登為待認養的寵物中，已存在的 species 列表
    const bySpecies = await Pet.distinct('species', { adoptionStatus: 'available', isActive: true });

    return res.json({
      success: true,
      data: {
        available,
        adopted,
        // importedPets: 匯入政府資料的寵物頁數量（對應「愛心家庭」）
        importedPets,
        bySpecies
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: '取得統計資料失敗' });
  }
});

module.exports = router;
