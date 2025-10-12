import { test, expect } from '@playwright/test';

test('users page renders', async ({ page }) => {
  await page.goto('http://localhost:3000/(modules)/users');
  await expect(page.getByText('Users')).toBeVisible();
});
