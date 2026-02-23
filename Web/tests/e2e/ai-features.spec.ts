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

test('navigate to AI chat', async ({ page }) => {
  await loginUser(page);
  await page.click('button:has-text("AI Coach")');

  await expect(page.locator('text=AI Training Coach')).toBeVisible();
});

test('send message to AI', async ({ page }) => {
  await loginUser(page);
  await page.click('button:has-text("AI Coach")');

  await page.fill('textarea[name="message"]', 'How should I prepare for a 10K race?');
  await page.click('button:has-text("Send")');

  await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
});

test('verify streaming response', async ({ page }) => {
  await loginUser(page);
  await page.click('button:has-text("AI Coach")');

  await page.fill('textarea[name="message"]', 'Give me a training tip');
  await page.click('button:has-text("Send")');

  const response = page.locator('[data-testid="ai-response"]');
  await expect(response).toBeVisible();

  const initialText = await response.textContent() || '';
  await page.waitForTimeout(1000);

  const updatedText = await response.textContent() || '';
  expect(updatedText.length).toBeGreaterThan(initialText.length);
});

test('view chat history', async ({ page }) => {
  await loginUser(page);
  await page.click('button:has-text("AI Coach")');

  await page.fill('textarea[name="message"]', 'What should I eat before running?');
  await page.click('button:has-text("Send")');

  await page.click('text=History');

  await expect(page.locator('text=What should I eat before running?')).toBeVisible();
});

test('configure AI settings', async ({ page }) => {
  await loginUser(page);
  await page.click('button:has-text("AI Coach")');
  await page.click('button:has-text("Settings")');

  await page.selectOption('select[name="model"]', 'gpt-4');
  await page.fill('input[name="temperature"]', '0.7');
  await page.fill('input[name="maxTokens"]', '500');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=Settings saved')).toBeVisible();
});

test('clear chat history', async ({ page }) => {
  await loginUser(page);
  await page.click('button:has-text("AI Coach")');
  await page.click('button:has-text("Settings")');

  await page.click('button:has-text("Clear Chat History")');
  await page.click('button:has-text("Confirm")');

  await expect(page.locator('text=Chat history cleared')).toBeVisible();
});
