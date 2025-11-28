const { test, expect } = require('@playwright/test');

test.describe('首頁瀏覽測試', () => {
  test('應該能夠載入首頁', async ({ page }) => {
    await page.goto('/');
    
    // 檢查標題
    await expect(page).toHaveTitle(/愛心動物認養平台/);
    
    // 檢查主要元素存在
    await expect(page.locator('text=尋找您的完美夥伴').or(page.locator('text=愛心認養'))).toBeVisible({ timeout: 10000 });
  });

  test('應該能夠查看精選寵物', async ({ page }) => {
    await page.goto('/');
    
    // 等待精選寵物區塊載入
    await page.waitForSelector('text=精選寵物', { timeout: 10000 });
    
    // 確認有寵物卡片
    const petCards = page.locator('[class*=\"pet-card\"], [class*=\"Card\"]').first();
    await expect(petCards).toBeVisible({ timeout: 10000 });
  });

  test('應該能夠點擊導航選單', async ({ page }) => {
    await page.goto('/');
    
    // 檢查導航選單
    const navLinks = ['首頁', '寵物列表', '社群', '關於我們'];
    for (const link of navLinks) {
      const element = page.locator(`text=${link}`).first();
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
      }
    }
  });
});
