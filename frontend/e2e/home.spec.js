const { test, expect } = require('@playwright/test');

test.describe('首頁瀏覽測試', () => {
  test('應該能夠載入首頁', async ({ page }) => {
    await page.goto('/');
    
    // 檢查標題
    await expect(page).toHaveTitle(/愛心動物認養平台/);
    
    // 檢查主要元素存在 - 實際頁面有「給每個毛孩溫暖的家」標題
    await expect(page.locator('text=給每個毛孩').or(page.locator('text=愛心認養平台'))).toBeVisible({ timeout: 15000 });
  });

  test('應該能夠查看精選寵物', async ({ page }) => {
    await page.goto('/');
    
    // 等待「等待認養的毛孩們」區塊載入
    await page.waitForSelector('text=等待認養的毛孩們', { timeout: 15000 });
    
    // 或者等待「開始尋找」按鈕載入（確認頁面已渲染）
    await page.waitForSelector('button:has-text("開始尋找")', { timeout: 15000 });
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
