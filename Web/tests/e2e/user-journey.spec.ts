import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3000' });

test('user journey', async ({ page }) => {
  await page.goto('/register');

  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'SecurePassword123!');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=Check your email')).toBeVisible();
});

test('complete user registration flow', async ({ page }) => {
  await page.goto('/register');

  await page.fill('input[type="email"]', 'newuser@example.com');
  await page.fill('input[type="password"]', 'AnotherSecure456!');
  await page.fill('input[name="name"]', 'New User');
  await page.fill('input[name="confirmPassword"]', 'AnotherSecure456!');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=Check your email for verification link')).toBeVisible();
});

test('login after registration', async ({ page }) => {
  await page.goto('/login');

  await page.click('button:has-text("Email")');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('**/');
});

test('navigate to dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.click('button:has-text("Email")');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');

  await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible();
});

test('logout functionality', async ({ page }) => {
  await page.goto('/login');

  await page.click('button:has-text("Email")');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');

  await page.click('button:has-text("Logout")');

  await expect(page).toHaveURL('**/login');
});
