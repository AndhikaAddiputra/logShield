import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('page header renders', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('stat cards load', async ({ page }) => {
    await expect(page.locator('text=Total Posko')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Critical Items').or(page.locator('text=Critical Items'))).toBeVisible();
  });

  test('stock weight section title visible', async ({ page }) => {
    await expect(page.locator('text=Daily Stock Weight per Item Category')).toBeVisible();
  });

  test('regional heatmap section visible', async ({ page }) => {
    await expect(page.locator('text=Regional Heatmap')).toBeVisible();
  });

  test('vulnerable fulfillment section visible', async ({ page }) => {
    await expect(page.locator('text=Pemenuhan Distribusi Kelompok Rentan')).toBeVisible();
  });
});

test.describe('Assets Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');
  });

  test('page title renders', async ({ page }) => {
    await expect(page.locator('text=Inventaris Pusat')).toBeVisible();
  });

  test('stock summary cards load', async ({ page }) => {
    await expect(page.locator('text=Total Item').or(page.locator('text=Stok Kritis'))).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Login Page', () => {
  test('login form renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button')).toContainText(/masuk|login|sign/i);
  });
});
