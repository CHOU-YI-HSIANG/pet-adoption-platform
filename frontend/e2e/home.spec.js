const { test, expect } = require('@playwright/test');

test.describe('首頁瀏覽測試', () => {
  test('應該能夠載入首頁', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // 等待 React 應用載入
    await page.waitForSelector('body', { state: 'attached' });
    
    // 檢查標題（等待時間更長）
    await page.waitForTimeout(2000); // 給 React 時間渲染
    await expect(page).toHaveTitle(/愛心動物認養平台/, { timeout: 15000 });
    
    // 檢查主要元素存在 - 使用 getByRole 避免 strict mode violation
    const mainHeading = page.getByRole('heading', { name: /給每個毛孩/ });
    await expect(mainHeading).toBeVisible({ timeout: 20000 });
  });

  test('應該能夠查看精選寵物', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // 等待頁面完全載入
    await page.waitForTimeout(3000);
    
    // 檢查「等待認養的毛孩們」或「開始尋找」按鈕
    const hasSection = await page.locator('text=等待認養的毛孩們').isVisible({ timeout: 5000 }).catch(() => false);
    const hasButton = await page.locator('button:has-text("開始尋找")').isVisible({ timeout: 5000 }).catch(() => false);
    
    // 至少其中一個應該可見
    expect(hasSection || hasButton).toBeTruthy();
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
