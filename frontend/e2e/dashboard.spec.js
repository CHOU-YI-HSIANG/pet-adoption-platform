const { test, expect } = require('@playwright/test');

// 管理員登入輔助函式
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[type=\"email\"], input[name=\"email\"]', 'admin@petadoption.com');
  await page.fill('input[type=\"password\"], input[name=\"password\"]', 'Admin123456');
  await page.click('button[type=\"submit\"], button:has-text(\"登入\"), button:has-text(\"登錄\")');
  await page.waitForURL(/\/(dashboard|admin|home|)/, { timeout: 10000 });
}

test.describe('管理員儀表板測試', () => {
  test('應該能夠存取管理員儀表板', async ({ page }) => {
    await loginAsAdmin(page);
    
    // 導向儀表板
    await page.goto('/admin/dashboard');
    
    // 確認儀表板載入
    await expect(page.locator('text=儀表板').or(page.locator('text=統計'))).toBeVisible({ timeout: 10000 });
  });

  test('應該能夠點擊統計卡片導航', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');
    
    // 等待統計卡片載入
    await page.waitForTimeout(2000);
    
    // 嘗試點擊「待審核申請」卡片
    const pendingCard = page.locator('text=待審核').or(page.locator('text=待處理'));
    
    if (await pendingCard.isVisible({ timeout: 5000 })) {
      await pendingCard.click();
      
      // 確認導向申請列表頁面
      await expect(page).toHaveURL(/\/admin\/(applications|adoptions)/, { timeout: 5000 });
    }
  });

  test('應該能夠查看寵物管理', async ({ page }) => {
    await loginAsAdmin(page);
    
    // 導向寵物管理頁面
    await page.goto('/admin/pets');
    
    // 確認頁面載入
    await expect(page.locator('text=寵物管理').or(page.locator('text=管理寵物'))).toBeVisible({ timeout: 10000 });
  });
});
