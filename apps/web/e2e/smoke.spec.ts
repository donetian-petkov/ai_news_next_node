import { test, expect } from '@playwright/test';

test('renders top bar and live columns shell', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /Live News Stream|Поток Новини На Живо/i })
  ).toBeVisible();
  await expect(
    page.getByText(/Live Columns|Колони На Живо/i)
  ).toBeVisible();
});

test('adds comma-separated keywords as chips and allows remove with x icon', async ({ page }) => {
  await page.goto('/');

  const showTopControls = page.getByRole('button', {
    name: /Show top controls|Покажи горни контроли/i
  });
  if (await showTopControls.isVisible()) {
    await showTopControls.click();
  }

  const aiSettingsSummary = page.locator('#aiSettingsSummary').first();
  await expect(aiSettingsSummary).toBeVisible();

  const aiSettingsDetails = page.locator('details:has(#aiSettingsSummary)').first();
  const isOpen = await aiSettingsDetails.evaluate(node => (node as HTMLDetailsElement).open);
  if (!isOpen) {
    await aiSettingsSummary.click();
  }

  const keywordInput = page.getByRole('textbox', {
    name: /Keywords|Ключови думи/i
  }).first();
  await keywordInput.fill('energy, crisis');

  await page.getByRole('button', {
    name: /Apply|Add|Приложи/i
  }).first().click();

  const energyChip = page.locator('.MuiChip-root', { hasText: /^energy$/i }).first();
  const crisisChip = page.locator('.MuiChip-root', { hasText: /^crisis$/i }).first();
  await expect(energyChip).toBeVisible();
  await expect(crisisChip).toBeVisible();

  await energyChip.locator('.MuiChip-deleteIcon').click();
  await expect(energyChip).toHaveCount(0);
  await expect(crisisChip).toBeVisible();
});
