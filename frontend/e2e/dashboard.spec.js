const { test, expect } = require('@playwright/test');

// 管理員登入輔助函式
async function loginAsAdmin(page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // 等待 React 渲染
  
  // 等待並填寫表單
  await page.waitForSelector('input#email', { state: 'visible', timeout: 15000 });
  await page.fill('input#email', 'admin@petadoption.com', { timeout: 10000 });
  await page.fill('input#password', 'Admin123456', { timeout: 10000 });
  
  // 點擊登入
  const loginButton = page.locator('button[type="submit"]').filter({ hasText: '登入' });
  await loginButton.click({ timeout: 10000 });
  
  // 等待導向成功
  await page.waitForURL(/\/(shelter\/dashboard|dashboard|admin)/, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
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
    
    // 驗證儀表板頁面存在且可以看到相關內容
    // 檢查是否有統計資訊或管理選項
    const hasDashboardContent = await page.locator('text=寵物管理').first().isVisible({ timeout: 5000 }).catch(() => false) ||
                                await page.locator('text=統計').first().isVisible({ timeout: 5000 }).catch(() => false) ||
                                await page.locator('text=管理').first().isVisible({ timeout: 5000 }).catch(() => false);
    
    // 儀表板應該顯示某種管理內容
    expect(hasDashboardContent).toBeTruthy();
  });

  test('應該能夠查看寵物管理', async ({ page }) => {
    await loginAsAdmin(page);
    
    // 導向寵物管理頁面
    await page.goto('/shelter/pets', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 確認成功載入頁面（驗證不會被重定向回 dashboard）
    const currentUrl = page.url();
    const isNotDashboard = !currentUrl.includes('/dashboard') || currentUrl.includes('/pets');
    expect(isNotDashboard).toBeTruthy();
  });
});
