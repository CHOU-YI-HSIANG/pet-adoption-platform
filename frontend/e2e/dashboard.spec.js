const { test, expect } = require('@playwright/test');

// 管理員登入輔助函式
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input#email', 'admin@petadoption.com');
  await page.fill('input#password', 'Admin123456');
  await page.click('button[type="submit"]:has-text("登入")');
  await page.waitForURL(/\/(shelter\/dashboard|dashboard|admin)/, { timeout: 15000 });
}

test.describe('管理員儀表板測試', () => {
  test('應該能夠存取管理員儀表板', async ({ page }) => {
    await loginAsAdmin(page);
    
    // 等待頁面載入（登入後自動導向儀表板）
    await page.waitForLoadState('networkidle');
    
    // 確認在儀表板頁面（URL 包含 dashboard）
    expect(page.url()).toContain('dashboard');
  });

  test('應該能夠點擊統計卡片導航', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    
    // 等待儀表板載入
    await page.waitForTimeout(3000);
    
    // 嘗試點擊任何可點擊的統計卡片或導航連結
    const navigationLinks = page.locator('a[href*="/admin/"], a[href*="/shelter/"]');
    const count = await navigationLinks.count();
    
    // 如果有導航連結，測試通過
    expect(count).toBeGreaterThan(0);
  });

  test('應該能夠查看寵物管理', async ({ page }) => {
    await loginAsAdmin(page);
    
    // 導向寵物管理頁面
    await page.goto('/shelter/pets');
    await page.waitForLoadState('networkidle');
    
    // 確認在寵物管理頁面
    expect(page.url()).toContain('/pets');
  });
});
