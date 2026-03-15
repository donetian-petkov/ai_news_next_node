#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const WebSocket = require('ws');

const repoRoot = path.resolve(__dirname, '..');
const screenshotDir = path.join(repoRoot, 'docs', 'screenshots');
const baseUrl = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:3101';
const wsUrl = process.env.CAPTURE_WS_URL || 'ws://127.0.0.1:4101';

const screenshotNames = [
  'vibe-video-game-columns.png',
  'vibe-scifi-columns.png',
  'vibe-fantasy-columns.png',
  'vibe-cyber-witch-columns.png',
  'performance-mode-view.png',
  'top-controls-expanded.png',
  'news-card-research-cyberwitch.png',
  'news-card-ask-agent.png',
  'mobile-column-controls.png'
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function enableAiFeatures() {
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'set_ai_features',
        features: {
          biasDetection: true,
          sensationalismDetection: true,
          factHighlights: true,
          storyImpact: true,
          dailyBriefing: true,
          topicTracking: true,
          perspectiveSimulator: true,
          emergingStoryDetector: true,
          historicalComparison: true,
          futureScenarioGenerator: true,
          localImpactDetector: true
        },
        localRegion: 'Bulgaria',
        trackedTopics: ['Artificial Intelligence', 'Ukraine', 'Middle East', 'Bulgaria']
      }));
      setTimeout(() => {
        ws.close();
        resolve();
      }, 700);
    });
    ws.on('error', reject);
  });
}

async function waitForNews(page) {
  await page.waitForSelector('.news-item-card', { timeout: 60000 });
  await wait(2500);
}

async function waitForAiStatus(page) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const found = await page.locator('text=/Ready\\s*·|Analyzing|No strong signal yet|Готово\\s*·|Анализира се|Няма силен сигнал/i').count();
    if (found) return;
    await wait(2000);
  }
  throw new Error('Timed out waiting for AI status on cards');
}

async function dismissDesktopOverlay(page) {
  const overlay = page.locator('.desktopOverlayPaper');
  const overlayVisible = await overlay.isVisible().catch(() => false);
  if (!overlayVisible) return;
  const closeButton = page.getByRole('button', { name: /close/i }).first();
  if (await closeButton.count()) {
    await closeButton.click();
    await wait(500);
  }
}

async function openDesktopOverlay(page) {
  const overlay = page.locator('.desktopOverlayPaper');
  const overlayVisible = await overlay.isVisible().catch(() => false);
  if (overlayVisible) return;
  await page.locator('#menuToggle').click();
  await page.waitForSelector('.desktopOverlayPaper', { state: 'visible' });
  await wait(300);
}

async function setQuickVibe(page, vibe) {
  const select = page.locator('#quickVibeSelect');
  if (await select.count()) {
    await select.selectOption(vibe);
    await wait(800);
  }
}

async function ensureDark(page) {
  if ((await page.evaluate(() => document.body.dataset.theme)) === 'dark') return;
  await openDesktopOverlay(page);
  const colorModeButton = page.getByRole('button', { name: /color mode/i }).first();
  for (let i = 0; i < 3; i += 1) {
    if ((await page.evaluate(() => document.body.dataset.theme)) === 'dark') break;
    await colorModeButton.click();
    await wait(400);
  }
  await dismissDesktopOverlay(page);
}

async function prepDesktop(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitForNews(page);
  await ensureDark(page);
}

async function openFirstCardAnalysis(page) {
  const cardWithAi = page.locator('.news-item-card').filter({
    has: page.locator('text=/Ready\\s*·|Analyzing|No strong signal yet|Готово\\s*·|Анализира се|Няма силен сигнал/i')
  }).first();
  const fallbackCard = page.locator('.news-item-card').first();
  const firstCard = await cardWithAi.count() ? cardWithAi : fallbackCard;
  await firstCard.scrollIntoViewIfNeeded();
  const toggle = firstCard.getByRole('button', { name: /show ai analysis|покажи ai анализа/i }).first();
  if (await toggle.count()) {
    await toggle.click();
    await wait(500);
  }
  return firstCard;
}

async function captureDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 },
    colorScheme: 'dark'
  });

  await context.addInitScript(() => {
    localStorage.setItem('aiNews.uiPrefs.v3', JSON.stringify({
      colorMode: 'dark',
      language: 'en',
      menuCollapsed: true,
      controlsCollapsed: false,
      vibe: 'arcade',
      performanceMode: false,
      soundEnabled: false
    }));
  });

  const page = await context.newPage();
  await prepDesktop(page);
  await waitForAiStatus(page);

  await openDesktopOverlay(page);
  const aiFeaturesHeading = page.getByText('AI features').first();
  if (await aiFeaturesHeading.count()) {
    await aiFeaturesHeading.scrollIntoViewIfNeeded();
    await wait(300);
  }
  await page.screenshot({ path: path.join(screenshotDir, 'top-controls-expanded.png'), fullPage: false });

  await dismissDesktopOverlay(page);

  const vibeShots = [
    ['arcade', 'vibe-video-game-columns.png'],
    ['scifi', 'vibe-scifi-columns.png'],
    ['fantasy', 'vibe-fantasy-columns.png'],
    ['cyberwitch', 'vibe-cyber-witch-columns.png']
  ];

  for (const [vibe, name] of vibeShots) {
    await setQuickVibe(page, vibe);
    await wait(1200);
    await page.screenshot({ path: path.join(screenshotDir, name), fullPage: false });
  }

  await openDesktopOverlay(page);
  const perfButton = page.getByRole('button', { name: /performance mode/i }).first();
  if (await perfButton.count()) {
    await perfButton.click();
    await wait(400);
  }
  await dismissDesktopOverlay(page);
  await page.screenshot({ path: path.join(screenshotDir, 'performance-mode-view.png'), fullPage: false });

  await setQuickVibe(page, 'cyberwitch');
  await wait(1200);
  const firstCard = await openFirstCardAnalysis(page);
  await firstCard.screenshot({ path: path.join(screenshotDir, 'news-card-research-cyberwitch.png') });

  const askButton = firstCard.getByRole('button', { name: /ask agent/i }).first();
  if (await askButton.count()) {
    await askButton.click();
    await wait(500);
  }
  await firstCard.screenshot({ path: path.join(screenshotDir, 'news-card-ask-agent.png') });

  await context.close();
  await browser.close();
}

async function captureMobile() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    colorScheme: 'dark'
  });

  await context.addInitScript(() => {
    localStorage.setItem('aiNews.uiPrefs.v3', JSON.stringify({
      colorMode: 'dark',
      language: 'en',
      vibe: 'cyberwitch',
      soundEnabled: false,
      menuCollapsed: true,
      controlsCollapsed: false
    }));
  });

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.feed-column-shell', { timeout: 60000 });
  await wait(5000);

  const targetColumn = page.locator('.feed-column-shell').filter({
    hasText: /Filtered|Emerging story/i
  }).first();
  const fallbackColumn = page.locator('.feed-column-shell').first();
  const column = await targetColumn.count() ? targetColumn : fallbackColumn;
  await column.scrollIntoViewIfNeeded();

  const firstCard = column.locator('.news-item-card').first();
  const aiToggle = firstCard.getByRole('button', { name: /show ai analysis|покажи ai анализа/i }).first();
  if (await aiToggle.count()) {
    await aiToggle.click();
    await wait(600);
  }

  await column.screenshot({ path: path.join(screenshotDir, 'mobile-column-controls.png') });
  await context.close();
  await browser.close();
}

async function main() {
  await ensureDir(screenshotDir);
  await enableAiFeatures();
  await captureDesktop();
  await captureMobile();
  console.log(`Updated screenshots in ${screenshotDir}`);
  console.log(`Files: ${screenshotNames.join(', ')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
