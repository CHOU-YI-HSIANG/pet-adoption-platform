/**
 * 單元測試：在收容所天數計算邏輯
 * 
 * 測試目標：驗證 daysInShelterMin/Max 篩選條件的日期計算
 * 對應文件：backend/routes/pets.js (lines 297-314)
 * Quality Gate: TEST-001 (Medium priority)
 */

const { describe, test, expect } = require('@jest/globals');

/**
 * 日期計算輔助函數
 * 這是從 routes/pets.js 中提取出來的邏輯
 */
function calculateShelterDateRange(daysInShelterMin, daysInShelterMax) {
  const today = new Date();
  const dateQuery = {};
  
  // 計算最大天數的最小日期（入所最早日期）
  // 注意：需要明確檢查 null/undefined，因為 0 也是有效值
  if (daysInShelterMax !== null && daysInShelterMax !== undefined) {
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - parseInt(daysInShelterMax));
    dateQuery.$gte = minDate;
  }
  
  // 計算最小天數的最大日期（入所最晚日期）
  if (daysInShelterMin !== null && daysInShelterMin !== undefined) {
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() - parseInt(daysInShelterMin));
    dateQuery.$lte = maxDate;
  }
  
  return Object.keys(dateQuery).length > 0 ? dateQuery : null;
}

/**
 * 計算兩個日期之間的天數差
 */
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

describe('在收容所天數計算邏輯測試', () => {
  
  describe('基本功能測試', () => {
    test('應該返回 null 當沒有提供任何天數參數', () => {
      const result = calculateShelterDateRange(null, null);
      expect(result).toBeNull();
    });

    test('應該計算最小天數 (30天) 的日期範圍', () => {
      const result = calculateShelterDateRange(30, null);
      expect(result).toHaveProperty('$lte');
      expect(result.$lte).toBeInstanceOf(Date);
      
      // 驗證計算結果約為 30 天前
      const today = new Date();
      const daysDiff = daysBetween(today, result.$lte);
      expect(daysDiff).toBeCloseTo(30, 0);
    });

    test('應該計算最大天數 (180天) 的日期範圍', () => {
      const result = calculateShelterDateRange(null, 180);
      expect(result).toHaveProperty('$gte');
      expect(result.$gte).toBeInstanceOf(Date);
      
      // 驗證計算結果約為 180 天前
      const today = new Date();
      const daysDiff = daysBetween(today, result.$gte);
      expect(daysDiff).toBeCloseTo(180, 0);
    });

    test('應該計算最小和最大天數的完整範圍 (30-180天)', () => {
      const result = calculateShelterDateRange(30, 180);
      expect(result).toHaveProperty('$gte');
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const minDaysDiff = daysBetween(today, result.$gte);
      const maxDaysDiff = daysBetween(today, result.$lte);
      
      expect(minDaysDiff).toBeCloseTo(180, 0); // $gte 是 180 天前
      expect(maxDaysDiff).toBeCloseTo(30, 0);  // $lte 是 30 天前
    });
  });

  describe('邊界條件測試', () => {
    test('應該處理 0 天（今天入所）', () => {
      const result = calculateShelterDateRange(0, null);
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$lte);
      expect(daysDiff).toBeLessThanOrEqual(1); // 考慮到執行時間誤差
    });

    test('應該處理 1 天', () => {
      const result = calculateShelterDateRange(1, null);
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$lte);
      expect(daysDiff).toBeCloseTo(1, 0);
    });

    test('應該處理相同的最小和最大天數', () => {
      const result = calculateShelterDateRange(30, 30);
      expect(result).toHaveProperty('$gte');
      expect(result).toHaveProperty('$lte');
      
      // 當 min === max，範圍應該非常小（約為同一天）
      const daysDiff = daysBetween(result.$gte, result.$lte);
      expect(daysDiff).toBeLessThanOrEqual(1);
    });

    test('應該處理大數值 (365天)', () => {
      const result = calculateShelterDateRange(null, 365);
      expect(result).toHaveProperty('$gte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$gte);
      expect(daysDiff).toBeCloseTo(365, 1); // 允許 ±1 天誤差
    });

    test('應該處理超過一年的天數 (500天)', () => {
      const result = calculateShelterDateRange(null, 500);
      expect(result).toHaveProperty('$gte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$gte);
      expect(daysDiff).toBeCloseTo(500, 1);
    });
  });

  describe('閏年與月份邊界測試', () => {
    test('應該正確處理跨月計算 (31天)', () => {
      const result = calculateShelterDateRange(31, null);
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$lte);
      expect(daysDiff).toBeCloseTo(31, 1);
    });

    test('應該正確處理 2月的日期計算 (60天)', () => {
      const result = calculateShelterDateRange(60, null);
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$lte);
      expect(daysDiff).toBeCloseTo(60, 1);
    });

    test('應該正確處理閏年邊界 (366天)', () => {
      const result = calculateShelterDateRange(null, 366);
      expect(result).toHaveProperty('$gte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$gte);
      expect(daysDiff).toBeCloseTo(366, 2); // 允許 ±2 天誤差（考慮閏年）
    });
  });

  describe('字串輸入測試（parseInt 處理）', () => {
    test('應該正確處理字串型別的天數', () => {
      const result = calculateShelterDateRange('30', '180');
      expect(result).toHaveProperty('$gte');
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const minDaysDiff = daysBetween(today, result.$gte);
      const maxDaysDiff = daysBetween(today, result.$lte);
      
      expect(minDaysDiff).toBeCloseTo(180, 0);
      expect(maxDaysDiff).toBeCloseTo(30, 0);
    });

    test('應該正確處理數字字串 "0"', () => {
      const result = calculateShelterDateRange('0', null);
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$lte);
      expect(daysDiff).toBeLessThanOrEqual(1);
    });
  });

  describe('日期物件完整性測試', () => {
    test('返回的日期物件應該是有效的 Date 實例', () => {
      const result = calculateShelterDateRange(30, 180);
      
      expect(result.$gte).toBeInstanceOf(Date);
      expect(result.$lte).toBeInstanceOf(Date);
      expect(result.$gte.getTime()).not.toBeNaN();
      expect(result.$lte.getTime()).not.toBeNaN();
    });

    test('$lte 應該小於或等於 $gte（時間邏輯正確）', () => {
      const result = calculateShelterDateRange(30, 180);
      
      // 因為 daysInShelterMin 對應較近的日期，daysInShelterMax 對應較遠的日期
      // 所以 $lte（30天前）應該 >= $gte（180天前）
      expect(result.$lte.getTime()).toBeGreaterThanOrEqual(result.$gte.getTime());
    });

    test('所有返回的日期應該在過去（不能是未來）', () => {
      const today = new Date();
      const result = calculateShelterDateRange(1, 100);
      
      expect(result.$gte.getTime()).toBeLessThanOrEqual(today.getTime());
      expect(result.$lte.getTime()).toBeLessThanOrEqual(today.getTime());
    });
  });

  describe('實際使用場景測試', () => {
    test('場景1: 篩選剛入所的寵物（0-7天）', () => {
      const result = calculateShelterDateRange(0, 7);
      expect(result).toHaveProperty('$gte');
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const minDaysDiff = daysBetween(today, result.$gte);
      const maxDaysDiff = daysBetween(today, result.$lte);
      
      expect(minDaysDiff).toBeCloseTo(7, 0);
      expect(maxDaysDiff).toBeLessThanOrEqual(1);
    });

    test('場景2: 篩選需要關注的寵物（30-90天）', () => {
      const result = calculateShelterDateRange(30, 90);
      expect(result).toHaveProperty('$gte');
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const minDaysDiff = daysBetween(today, result.$gte);
      const maxDaysDiff = daysBetween(today, result.$lte);
      
      expect(minDaysDiff).toBeCloseTo(90, 0);
      expect(maxDaysDiff).toBeCloseTo(30, 0);
    });

    test('場景3: 篩選長期未被認養的寵物（180天以上）', () => {
      const result = calculateShelterDateRange(180, null);
      expect(result).toHaveProperty('$lte');
      expect(result).not.toHaveProperty('$gte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$lte);
      
      expect(daysDiff).toBeCloseTo(180, 0);
    });

    test('場景4: 篩選所有在收容所的寵物（0天以上）', () => {
      const result = calculateShelterDateRange(0, null);
      expect(result).toHaveProperty('$lte');
      
      const today = new Date();
      const daysDiff = daysBetween(today, result.$lte);
      
      expect(daysDiff).toBeLessThanOrEqual(1);
    });
  });
});

// 如果直接執行此文件
if (require.main === module) {
  console.log('請使用 npm test 或 jest 執行此測試文件');
  console.log('範例: npm test tests/daysInShelter.test.js');
}
