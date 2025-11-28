const { test, expect } = require('@playwright/test');

test.describe('使用者認證測試', () => {
  test('應該能夠開啟登入頁面', async ({ page }) => {
    await page.goto('/');
    
    // 查找登入按鈕或連結
    const loginButton = page.locator('text=登入').or(page.locator('text=登錄')).first();
    if (await loginButton.isVisible({ timeout: 5000 })) {
      await loginButton.click();
      await page.waitForURL('**/login', { timeout: 5000 });
    } else {
      await page.goto('/login');
    }
    
    // 確認在登入頁面
    await expect(page.locator('input[type=\"email\"], input[name=\"email\"]')).toBeVisible();
    await expect(page.locator('input[type=\"password\"], input[name=\"password\"]')).toBeVisible();
  });

  test('應該能夠執行管理員登入', async ({ page }) => {
    await page.goto('/login');
    
    // 填寫管理員憑證
    await page.fill('input[type=\"email\"], input[name=\"email\"]', 'admin@petadoption.com');
    await page.fill('input[type=\"password\"], input[name=\"password\"]', 'Admin123456');
    
    // 點擊登入
    await page.click('button[type=\"submit\"], button:has-text(\"登入\"), button:has-text(\"登錄\")');
    
    // 等待導向儀表板或首頁
    await page.waitForURL(/\/(dashboard|admin|home|)/, { timeout: 10000 });
    
    // 確認登入成功 (應該看到登出按鈕或使用者資訊)
    await expect(
      page.locator('text=登出').or(page.locator('text=管理員')).or(page.locator('text=儀表板'))
    ).toBeVisible({ timeout: 5000 });
  });
});
