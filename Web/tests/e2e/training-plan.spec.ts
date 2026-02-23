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

test('navigate to plan view', async ({ page }) => {
  await loginUser(page);
  await page.click('text=Training Plan');

  await expect(page.locator('text=Training Plan')).toBeVisible();
  await expect(page.locator('[data-testid="calendar"]')).toBeVisible();
});

test('create new goal', async ({ page }) => {
  await loginUser(page);
  await page.click('text=Training Plan');
  await page.click('button:has-text("New Goal")');

  await page.fill('input[name="goalName"]', 'Marathon Preparation');
  await page.click('button:has-text("Continue")');

  await expect(page.locator('text=Marathon Preparation')).toBeVisible();
});

test('set race details', async ({ page }) => {
  await loginUser(page);
  await page.click('text=Training Plan');
  await page.click('button:has-text("New Goal")');

  await page.fill('input[name="goalName"]', 'Spring Marathon');
  await page.click('button:has-text("Continue")');

  await page.selectOption('select[name="raceType"]', 'marathon');
  await page.fill('input[name="raceDate"]', '2024-04-15');
  await page.fill('input[name="targetTime"]', '3:30:00');
  await page.click('button:has-text("Generate Plan")');

  await expect(page.locator('text=Spring Marathon')).toBeVisible();
});

test('generate training plan', async ({ page }) => {
  await loginUser(page);
  await page.click('text=Training Plan');
  await page.click('button:has-text("New Goal")');

  await page.fill('input[name="goalName"]', '10K Race');
  await page.click('button:has-text("Continue")');

  await page.selectOption('select[name="raceType"]', '10k');
  await page.fill('input[name="raceDate"]', '2024-03-01');
  await page.fill('input[name="targetTime"]', '45:00');
  await page.click('button:has-text("Generate Plan")');

  await expect(page.locator('text=Training plan generated')).toBeVisible();
  await expect(page.locator('[data-testid="workout-list"]')).toBeVisible();
});

test('view calendar with workouts', async ({ page }) => {
  await loginUser(page);
  await page.click('text=Training Plan');

  await expect(page.locator('[data-testid="calendar"]')).toBeVisible();
  await expect(page.locator('[data-testid="workout-day"]')).toBeVisible();
});

test('mark workout as complete', async ({ page }) => {
  await loginUser(page);
  await page.click('text=Training Plan');

  const workoutDay = page.locator('[data-testid="workout-day"]').first();
  await workoutDay.click();
  await page.click('button:has-text("Mark Complete")');

  await expect(page.locator('[data-testid="workout-day"]').first()).toHaveClass(/completed/);
});

test('edit workout details', async ({ page }) => {
  await loginUser(page);
  await page.click('text=Training Plan');

  const workoutDay = page.locator('[data-testid="workout-day"]').first();
  await workoutDay.click();
  await page.click('button:has-text("Edit")');

  await page.fill('input[name="duration"]', '60');
  await page.fill('input[name="notes"]', 'Feeling great today');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=Workout updated')).toBeVisible();
});

test('delete training goal', async ({ page }) => {
  await loginUser(page);
  await page.click('text=Training Plan');
  await page.click('button:has-text("Manage Goals")');

  const deleteButton = page.locator('button:has-text("Delete")').first();
  await deleteButton.click();
  await page.click('button:has-text("Confirm")');

  await expect(page.locator('text=Goal deleted')).toBeVisible();
});
