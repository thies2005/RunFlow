import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3000' });

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
});

async function loginAdmin(page: any) {
  await page.click('button:has-text("Email")');
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');
}

test('admin panel login', async ({ page }) => {
  await loginAdmin(page);

  await expect(page.locator('text=Admin Panel')).toBeVisible();
});

test('view users table', async ({ page }) => {
  await loginAdmin(page);
  await page.click('text=Users');

  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('th:has-text("Email")')).toBeVisible();
  await expect(page.locator('th:has-text("Name")')).toBeVisible();
});

test('create backup', async ({ page }) => {
  await loginAdmin(page);
  await page.click('text=Settings');
  await page.click('text=Backups');

  await page.click('button:has-text("Create Backup")');

  await expect(page.locator('text=Backup created successfully')).toBeVisible();
});

test('configure AI provider', async ({ page }) => {
  await loginAdmin(page);
  await page.click('text=Settings');
  await page.click('text=AI Configuration');

  await page.selectOption('select[name="provider"]', 'openai');
  await page.fill('input[name="apiKey"]', 'sk-test-key-12345');
  await page.fill('input[name="model"]', 'gpt-4');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=AI configuration saved')).toBeVisible();
});

test('test API key', async ({ page }) => {
  await loginAdmin(page);
  await page.click('text=Settings');
  await page.click('text=AI Configuration');

  await page.fill('input[name="apiKey"]', 'sk-test-key-12345');
  await page.click('button:has-text("Test API Key")');

  await expect(page.locator('text=API key is valid')).toBeVisible();
});

test('delete user from admin panel', async ({ page }) => {
  await loginAdmin(page);
  await page.click('text=Users');

  const deleteButton = page.locator('button:has-text("Delete")').first();
  await deleteButton.click();
  await page.click('button:has-text("Confirm")');

  await expect(page.locator('text=User deleted successfully')).toBeVisible();
});
