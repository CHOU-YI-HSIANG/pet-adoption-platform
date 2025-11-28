const { test, expect } = require('@playwright/test');

test.describe('使用者認證測試', () => {
  test('應該能夠開啟登入頁面', async ({ page }) => {
    // 直接導向登入頁面
    await page.goto('/login');
    
    // 等待頁面載入完成
    await page.waitForLoadState('networkidle');
    
    // 確認登入頁面標題
    await expect(page.locator('h2:has-text("登入您的帳號")')).toBeVisible({ timeout: 10000 });
    
    // 確認在登入頁面 - 使用實際的 id
    await expect(page.locator('input#email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#password')).toBeVisible({ timeout: 10000 });
  });

  test('應該能夠執行管理員登入', async ({ page }) => {
    await page.goto('/login');
    
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
    
    // 填寫管理員憑證 - 使用實際的 id
    await page.fill('input#email', 'admin@petadoption.com');
    await page.fill('input#password', 'Admin123456');
    
    // 點擊登入按鈕
    await page.click('button[type="submit"]:has-text("登入")');
    
    // 等待導向 - 管理員會導向 /shelter/dashboard
    await page.waitForURL(/\/(shelter\/dashboard|dashboard|admin)/, { timeout: 15000 });
    
    // 確認導向成功
    expect(page.url()).toMatch(/\/(shelter\/dashboard|dashboard|admin)/);
  });
});
