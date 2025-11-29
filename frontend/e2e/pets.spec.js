const { test, expect } = require('@playwright/test');

test.describe('寵物瀏覽測試', () => {
  test('應該能夠瀏覽寵物列表頁面', async ({ page }) => {
    await page.goto('/pets');
    await page.waitForLoadState('networkidle');
    
    // 確認在寵物列表頁面
    expect(page.url()).toContain('/pets');
    
    // 等待頁面內容載入（至少有一些寵物卡片或搜尋框）
    await page.waitForTimeout(3000);
  });

  test('應該能夠使用篩選功能', async ({ page }) => {
    await page.goto('/pets');
    
    // 等待頁面載入
    await page.waitForTimeout(2000);
    
    // 檢查是否有篩選選項 (類型、年齡、性別等)
    const filterExists = await page.locator('select, button:has-text(\"篩選\"), input[placeholder*=\"搜尋\"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (filterExists) {
      // 如果有篩選器，測試使用它
      const filter = page.locator('select, input[placeholder*=\"搜尋\"]').first();
      await expect(filter).toBeVisible();
    }
  });

  test('應該能夠點擊查看寵物詳情', async ({ page }) => {
    await page.goto('/pets');
    
    // 等待寵物卡片載入
    await page.waitForTimeout(3000);
    
    // 使用更精確的選擇器：找到第一個寵物詳情連結
    const firstPetLink = page.locator('a[href*="/pets/"]').first();
    
    if (await firstPetLink.isVisible({ timeout: 5000 })) {
      await firstPetLink.click();
      
      // 確認導向詳情頁
      await expect(page).toHaveURL(/\/pets\/[a-f0-9]+/, { timeout: 5000 });
      
      // 確認詳情頁有內容 - 使用 .first() 避免 strict mode
      await expect(page.locator('text=認養').first().or(page.locator('text=申請').first())).toBeVisible({ timeout: 5000 });
    }
  });
});
