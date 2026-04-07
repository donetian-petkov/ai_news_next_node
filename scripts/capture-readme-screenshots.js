#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const repoRoot = path.resolve(__dirname, '..');
const screenshotDir = path.join(repoRoot, 'docs', 'screenshots');
const envPath = path.join(repoRoot, '.env');
const baseUrl = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:3000';
const apiBaseUrl = process.env.CAPTURE_API_BASE_URL || 'http://127.0.0.1:4000';
const authTokenStorageKey = 'ai_news_auth_token';
const uiPrefsStorageKey = 'aiNews.uiPrefs.v3';

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

const baseUiPrefs = {
  language: 'en',
  aiProvider: 'openai',
  colorMode: 'dark',
  menuCollapsed: true,
  controlsCollapsed: false,
  searchVisible: false,
  addStreamVisible: false,
  allColumnControlsHidden: false,
  buttonMode: 'text',
  font: 'system',
  fontSize: 'md',
  scheme: 'classic',
  timezone: 'system',
  dateFormat: 'ddmmyy',
  showNewsCovers: true,
  performanceMode: false,
  menuHintMode: 'buttons',
  effectIntensity: 'medium',
  soundEnabled: false,
  soundTheme: 'vibe',
  vibe: 'arcade'
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function parseDotEnvValue(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readRequiredOpenAiKey() {
  const envValue = parseDotEnvValue(process.env.OPENAI_API_KEY || '');
  if (envValue) return envValue;

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^OPENAI_API_KEY\s*=\s*(.*)$/);
    if (!match) continue;
    const value = parseDotEnvValue(match[1]);
    if (value) return value;
  }
  throw new Error(`OPENAI_API_KEY is missing in ${envPath}`);
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body && typeof body.error === 'string'
      ? body.error
      : `Request failed (${response.status})`;
    throw new Error(`${message} at ${url}`);
  }

  return body;
}

async function createCaptureSession() {
  const apiKey = readRequiredOpenAiKey();
  const username = `readmecapture${Date.now()}${Math.random().toString(36).slice(2, 7)}`.toLowerCase();
  const password = `capture-${Math.random().toString(36).slice(2, 12)}`;

  const auth = await requestJson(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  await requestJson(`${apiBaseUrl}/api/auth/provider-key`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`
    },
    body: JSON.stringify({
      provider: 'openai',
      apiKey
    })
  });

  return {
    token: auth.token,
    username
  };
}

function buildUiPrefs(patch = {}) {
  return {
    ...baseUiPrefs,
    ...patch,
    persistedAtMs: Date.now()
  };
}

async function waitForApp(page) {
  await page.getByRole('heading', { name: /Live News Stream|Поток Новини На Живо/i }).waitFor({ timeout: 60000 });
  await page.waitForSelector('.feed-column-shell', { timeout: 90000 });
  await page.waitForSelector('.news-item-card', { timeout: 90000 });
  await wait(3000);
}

async function gotoApp(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
}

async function reloadWithPrefs(page, patch) {
  await page.evaluate(({ patch, uiPrefsStorageKey }) => {
    const raw = window.localStorage.getItem(uiPrefsStorageKey);
    let current = {};
    try {
      current = raw ? JSON.parse(raw) : {};
    } catch {
      current = {};
    }
    window.localStorage.setItem(uiPrefsStorageKey, JSON.stringify({
      ...current,
      ...patch,
      persistedAtMs: Date.now()
    }));
  }, { patch, uiPrefsStorageKey });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
}

async function closeDesktopOverlay(page) {
  const overlay = page.locator('.desktopOverlayPaper');
  if (!(await overlay.isVisible().catch(() => false))) return;
  await page.getByRole('button', { name: /Close|Затвори/i }).first().click();
  await overlay.waitFor({ state: 'hidden', timeout: 15000 });
}

async function openDesktopOverlay(page) {
  const overlay = page.locator('.desktopOverlayPaper');
  if (await overlay.isVisible().catch(() => false)) return overlay;
  await page.locator('#menuToggle').click();
  await overlay.waitFor({ state: 'visible', timeout: 15000 });
  await wait(500);
  return overlay;
}

async function captureVibeShot(page, vibe, name) {
  await reloadWithPrefs(page, { vibe, performanceMode: false });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(400);
  await page.screenshot({
    path: path.join(screenshotDir, name),
    fullPage: false
  });
}

async function findCardWithResearch(page) {
  const researchCard = page.locator('.news-item-card').filter({
    hasText: /Research|Изследване/i
  }).first();

  if (await researchCard.count()) return researchCard;

  const summaryCard = page.locator('.news-item-card').filter({
    hasText: /Summary|Резюме/i
  }).first();
  if (await summaryCard.count()) return summaryCard;

  return page.locator('.news-item-card').first();
}

async function captureDesktop(token) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1720, height: 1180 },
    colorScheme: 'dark'
  });

  await context.addInitScript(({ token, authTokenStorageKey, uiPrefsStorageKey, prefs }) => {
    window.localStorage.setItem(authTokenStorageKey, token);
    window.localStorage.setItem(uiPrefsStorageKey, JSON.stringify(prefs));
  }, {
    token,
    authTokenStorageKey,
    uiPrefsStorageKey,
    prefs: buildUiPrefs()
  });

  const page = await context.newPage();
  await gotoApp(page);

  const overlay = await openDesktopOverlay(page);
  const appearanceSummary = overlay.locator('#appearanceSummary').first();
  if (await appearanceSummary.count()) {
    await appearanceSummary.scrollIntoViewIfNeeded();
    await wait(400);
  }
  await overlay.screenshot({ path: path.join(screenshotDir, 'top-controls-expanded.png') });
  await closeDesktopOverlay(page);

  await captureVibeShot(page, 'arcade', 'vibe-video-game-columns.png');
  await captureVibeShot(page, 'scifi', 'vibe-scifi-columns.png');
  await captureVibeShot(page, 'fantasy', 'vibe-fantasy-columns.png');
  await captureVibeShot(page, 'cyberwitch', 'vibe-cyber-witch-columns.png');

  await reloadWithPrefs(page, { vibe: 'scifi', performanceMode: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(400);
  await page.screenshot({
    path: path.join(screenshotDir, 'performance-mode-view.png'),
    fullPage: false
  });

  await reloadWithPrefs(page, { vibe: 'cyberwitch', performanceMode: false, buttonMode: 'text' });
  const detailCard = await findCardWithResearch(page);
  await detailCard.scrollIntoViewIfNeeded();
  await wait(400);
  const aiToggle = detailCard.getByRole('button', { name: /Show AI analysis|Hide AI analysis|Покажи AI анализа|Скрий AI анализа/i }).first();
  if (await aiToggle.count()) {
    const label = await aiToggle.textContent();
    if (label && /show/i.test(label)) {
      await aiToggle.click();
      await wait(500);
    }
  }
  await detailCard.screenshot({ path: path.join(screenshotDir, 'news-card-research-cyberwitch.png') });

  const askButton = detailCard.getByRole('button', { name: /Ask agent|Попитай агента/i }).first();
  if (await askButton.count()) {
    await askButton.click();
    await wait(600);
  }
  await detailCard.screenshot({ path: path.join(screenshotDir, 'news-card-ask-agent.png') });

  await context.close();
  await browser.close();
}

async function captureMobile(token) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    colorScheme: 'dark'
  });

  await context.addInitScript(({ token, authTokenStorageKey, uiPrefsStorageKey, prefs }) => {
    window.localStorage.setItem(authTokenStorageKey, token);
    window.localStorage.setItem(uiPrefsStorageKey, JSON.stringify(prefs));
  }, {
    token,
    authTokenStorageKey,
    uiPrefsStorageKey,
    prefs: buildUiPrefs({
      vibe: 'cyberwitch',
      buttonMode: 'text'
    })
  });

  const page = await context.newPage();
  await gotoApp(page);

  const column = page.locator('.feed-column-shell').first();
  await column.scrollIntoViewIfNeeded();
  const controlsToggle = column.getByRole('button', { name: /Show controls|Hide controls|Покажи контролите|Скрий контролите/i }).first();
  if (await controlsToggle.count()) {
    const label = (await controlsToggle.textContent()) || '';
    if (/show/i.test(label) || /покажи/i.test(label)) {
      await controlsToggle.click();
      await wait(500);
    }
  }

  await column.screenshot({ path: path.join(screenshotDir, 'mobile-column-controls.png') });

  await context.close();
  await browser.close();
}

async function main() {
  await ensureDir(screenshotDir);
  const { token, username } = await createCaptureSession();
  await captureDesktop(token);
  await captureMobile(token);
  console.log(`Updated README screenshots in ${screenshotDir}`);
  console.log(`Capture account: ${username}`);
  console.log(`Files: ${screenshotNames.join(', ')}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
