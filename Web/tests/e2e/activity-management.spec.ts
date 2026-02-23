import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3000' });

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
});

async function loginUser(page: any) {
  await page.click('button:has-text("Email")');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');
}

test('connect strava', async ({ page }) => {
  await loginUser(page);
  await page.click('text=View All');

  await expect(page.locator('text=Recent Activities')).toBeVisible();
});

test('view activities list', async ({ page }) => {
  await loginUser(page);
  await page.click('text=View All');

  await expect(page.locator('text=Recent Activities')).toBeVisible();
  await expect(page.locator('[data-testid="activity-list"]')).toBeVisible();
});

test('click activity details', async ({ page }) => {
  await loginUser(page);
  await page.click('text=View All');

  const activityCard = page.locator('[data-testid="activity-card"]').first();
  await activityCard.click();

  await expect(page.locator('text=Activity Details')).toBeVisible();
  await expect(page.locator('[data-testid="activity-distance"]')).toBeVisible();
  await expect(page.locator('[data-testid="activity-duration"]')).toBeVisible();
});

test('edit activity name', async ({ page }) => {
  await loginUser(page);
  await page.click('text=View All');

  const activityCard = page.locator('[data-testid="activity-card"]').first();
  await activityCard.click();

  await page.click('button:has-text("Edit")');
  await page.fill('input[name="name"]', 'Updated Morning Run');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=Updated Morning Run')).toBeVisible();
});

test('create manual activity', async ({ page }) => {
  await loginUser(page);
  await page.click('text=View All');
  await page.click('button:has-text("Add Activity")');

  await page.fill('input[name="name"]', 'Manual Evening Run');
  await page.fill('input[name="distance"]', '5.2');
  await page.selectOption('select[name="type"]', 'run');
  await page.fill('input[name="duration"]', '30');
  await page.fill('input[name="date"]', '2024-02-12');
  await page.click('button:has-text("Create")');

  await expect(page.locator('text=Activity created successfully')).toBeVisible();
  await expect(page.locator('text=Manual Evening Run')).toBeVisible();
});

test('delete activity', async ({ page }) => {
  await loginUser(page);
  await page.click('text=View All');

  const activityCard = page.locator('[data-testid="activity-card"]').first();
  await activityCard.click();

  await page.click('button:has-text("Delete")');
  await page.click('button:has-text("Confirm")');

  await expect(page.locator('text=Activity deleted successfully')).toBeVisible();
});
