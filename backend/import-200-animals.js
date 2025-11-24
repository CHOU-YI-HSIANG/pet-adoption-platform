const express = require('express');
const router = express.Router();
const axios = require('axios');
const Pet = require('../models/Pet');
const { auth } = require('../middleware/auth');

// 政府開放平台 API 設定 - 使用正確的 API 格式
const GOV_API_BASE = 'https://data.moa.gov.tw/Service/OpenData/TransService.aspx';

/**
 * @route   GET /api/data-import/animal-recognition
 * @desc    從政府平台獲取動物認領養資料
 * @access  Private (需要管理員權限)
 */
//get('/animal-recognition', auth, async (req, res) => {
  try {
    // 檢查是否為管理員或收容所
    if (req.user.role !== 'admin' && req.user.role !== 'shelter') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '您沒有權限執行此操作'
        }
      });
    }

    const { page = 1, limit = 20, county = '', status = '', skip = 0 } = req.query;

    console.log('正在獲取政府動物資料...', { page, limit, county, status, skip });

    // 呼叫政府 API - 動物認領養資料
    const params = {
      UnitId: 'QcbUEzN6E6DL',  // 動物認領養資料的 UnitId
      $top: parseInt(limit),
      $skip: parseInt(skip) || ((parseInt(page) - 1) * parseInt(limit))  // 支援直接指定 skip
    };

    // 如果有篩選條件，加入 $filter
    const filters = [];
    if (county) {
      filters.push(`contains(animal_place,'${county}')`);
    }
    if (status) {
      filters.push(`contains(animal_status,'${status}')`);
    }
    if (filters.length > 0) {
      params.$filter = filters.join(' and ');
    }

    console.log('API 請求參數:', params);

    const response = await axios.get(GOV_API_BASE, {
      params,
      timeout: 30000,
      headers: {
        'Accept': 'application/json'
      }
    });

    const animals = Array.isArray(response.data) ? response.data : [];
    console.log(`成功獲取 ${animals.length} 筆動物資料`);

    res.json({
      success: true,
      data: {
        animals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: animals.length
        }
      }
    });

  } catch (error) {
    console.error('獲取動物認領養資料失敗:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: '獲取資料失敗',
        details: error.response?.data?.message || error.message
      }
    });
  }
});

/**
 * @route   POST /api/data-import/import-animals
 * @desc    匯入選定的動物資料到資料庫
 * @access  Private (需要管理員權限)
 */
//post('/import-animals', auth, async (req, res) => {
  try {
    // 檢查權限
    if (req.user.role !== 'admin' && req.user.role !== 'shelter') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '您沒有權限執行此操作'
        }
      });
    }

    const { animals } = req.body;

    if (!animals || !Array.isArray(animals) || animals.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '請提供要匯入的動物資料'
        }
      });
    }

    const importResults = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const animal of animals) {
      try {
        // 檢查是否已存在（使用政府資料的 animal_subid 作為唯一識別）
        const animalIdentifier = animal.animal_subid || animal.animal_id?.toString();
        const existingPet = await Pet.findOne({ 
          'govData.animalId': animalIdentifier
        });

        if (existingPet) {
          importResults.skipped++;
          continue;
        }

        // 映射政府資料到系統格式
        const petData = {
          name: animal.animal_title || animal.animal_subid || '待命名',
          species: mapSpecies(animal.animal_kind),
          breed: animal.animal_kind || '混種',
          age: parseAge(animal.animal_age),
          gender: mapGender(animal.animal_sex),
          size: mapSize(animal.animal_bodytype),
          color: animal.animal_colour || '未知',
          description: `
【收容資訊】
收容編號: ${animal.animal_subid || animal.animal_id}
收容所: ${animal.shelter_name || '未提供'}
收容地區: ${animal.animal_place || '未提供'}
尋獲地: ${animal.animal_foundplace || '未提供'}

【動物資訊】
年齡: ${animal.animal_age || '未知'}
毛色: ${animal.animal_colour || '未知'}
體型: ${animal.animal_bodytype || '未知'}
是否絕育: ${animal.animal_sterilization === 'T' ? '是' : animal.animal_sterilization === 'F' ? '否' : '未知'}

【聯絡資訊】
電話: ${animal.shelter_tel || '未提供'}
地址: ${animal.shelter_address || '未提供'}

【其他說明】
${animal.animal_caption || ''}
${animal.animal_remark || ''}

開放認養時間: ${animal.animal_opendate || '未提供'}
資料更新: ${animal.animal_update || '未提供'}
          `.trim(),
          location: {
            city: animal.animal_place || '',
            district: '',
            address: animal.shelter_address || ''
          },
          status: mapStatus(animal.animal_status),
          photos: animal.album_file ? [animal.album_file] : [],
          healthInfo: {
            vaccinated: true,
            neutered: animal.animal_sterilization === 'T',
            healthStatus: 'healthy'
          },
          // 添加必填的 shelterInfo 欄位
          shelterInfo: {
            intakeDate: animal.animal_createtime ? new Date(animal.animal_createtime) : new Date(),
            source: 'stray', // 政府資料來源預設為流浪動物
            location: animal.shelter_name || animal.animal_place || '政府開放資料',
            kennel: animal.animal_subid || animal.animal_id?.toString()
          },
          shelter: req.user._id,
          govData: {
            animalId: animal.animal_subid || animal.animal_id.toString(),
            subId: animal.animal_subid,
            areaCode: animal.animal_area_pkid,
            shelterCode: animal.animal_shelter_pkid,
            foundPlace: animal.animal_foundplace,
            foundDate: animal.animal_createtime,
            openDate: animal.animal_opendate,
            updateDate: animal.animal_update,
            closedDate: animal.animal_closeddate,
            shelterName: animal.shelter_name,
            shelterTel: animal.shelter_tel,
            shelterAddress: animal.shelter_address,
            title: animal.animal_title,
            caption: animal.animal_caption,
            remark: animal.animal_remark,
            originalData: animal
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await Pet.create(petData);
        importResults.success++;

      } catch (error) {
        importResults.failed++;
        importResults.errors.push({
          animalId: animal.animal_id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        imported: importResults.success,
        skipped: importResults.skipped,
        failed: importResults.failed,
        errors: importResults.errors
      }
    });

  } catch (error) {
    console.error('匯入動物資料失敗:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_ERROR',
        message: '匯入資料失敗',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/data-import/legal-pet-shops
 * @desc    從政府平台獲取合法特定寵物業名單
 * @access  Private
 */
//get('/legal-pet-shops', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, county = '' } = req.query;

    console.log('正在獲取合法寵物業資料...', { page, limit, county });

    const params = {
      UnitId: 'fNT9RMo8PQRO', // 合法特定寵物業名單的正確 UnitId
      $top: parseInt(limit),
      $skip: (parseInt(page) - 1) * parseInt(limit)
    };

    if (county) {
      params.$filter = `contains(業者地址,'${county}')`;
    }

    console.log('寵物業 API 請求參數:', params);

    const response = await axios.get(GOV_API_BASE, {
      params,
      timeout: 30000,
      headers: {
        'Accept': 'application/json'
      }
    });

    const shops = Array.isArray(response.data) ? response.data : [];
    console.log(`成功獲取 ${shops.length} 筆寵物業資料`);

    res.json({
      success: true,
      data: {
        shops,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: response.data.length
        }
      }
    });

  } catch (error) {
    console.error('獲取合法寵物業名單失敗:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: '獲取寵物業資料失敗',
        details: error.response?.data?.message || error.message
      }
    });
  }
});

// 輔助函數：映射物種
function mapSpecies(animalKind) {
  if (!animalKind) return 'other';
  const kind = animalKind.toLowerCase();
  if (kind.includes('狗') || kind.includes('dog')) return 'dog';
  if (kind.includes('貓') || kind.includes('cat')) return 'cat';
  if (kind.includes('兔') || kind.includes('rabbit')) return 'rabbit';
  if (kind.includes('鳥') || kind.includes('bird')) return 'bird';
  return 'other';
}

// 輔助函數：映射性別
function mapGender(animalSex) {
  if (!animalSex) return 'unknown';
  const sex = animalSex.toUpperCase();
  if (sex === 'M' || sex === 'MALE' || sex.includes('公')) return 'male';
  if (sex === 'F' || sex === 'FEMALE' || sex.includes('母')) return 'female';
  return 'unknown';
}

// 輔助函數：映射體型
function mapSize(bodyType) {
  if (!bodyType) return 'medium';
  const type = bodyType.toLowerCase();
  if (type.includes('small') || type.includes('小')) return 'small';
  if (type.includes('large') || type.includes('大')) return 'large';
  return 'medium';
}

// 輔助函數：映射狀態
function mapStatus(animalStatus) {
  if (!animalStatus) return 'available';
  const status = animalStatus.toLowerCase();
  if (status.includes('開放認養') || status.includes('available')) return 'available';
  if (status.includes('已認養') || status.includes('adopted')) return 'adopted';
  if (status.includes('其他') || status.includes('死亡')) return 'unavailable';
  return 'available';
}

// 輔助函數：解析年齡
function parseAge(animalAge) {
  if (!animalAge) return 1;
  
  // 嘗試提取數字
  const match = animalAge.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  // 根據描述推測
  const age = animalAge.toLowerCase();
  if (age.includes('幼') || age.includes('baby') || age.includes('puppy') || age.includes('kitten')) {
    return 0.5;
  }
  if (age.includes('老') || age.includes('senior')) {
    return 8;
  }
  
  return 2; // 預設為成年
}

module.exports = router;

importAnimals({ query: { skip: 100, limit: 200 } }, { json: (data) => console.log(data) }).then(() => process.exit(0));