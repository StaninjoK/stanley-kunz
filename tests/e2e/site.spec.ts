import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

/** All built pages (from dist/), so new pages are tested automatically. */
const PAGES = (() => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html') out.push('/' + path.relative('dist', path.dirname(p)).replace(/\\/g, '/') + (path.dirname(p) === 'dist' ? '' : '/'));
    }
  };
  walk('dist');
  return out.map((p) => p.replace('//', '/')).sort();
})();

for (const url of PAGES) {
  test(`${url} – renders without errors, overflow or serious a11y issues`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    // Reduced motion → no reveal transitions, so axe measures final colours, not mid-fade states.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url, { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(1);
    // reveal everything so axe sees final colours
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-visible')));
    await page.waitForTimeout(400);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('mobile menu opens, traps focus and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  const btn = page.locator('[data-menu-open]');
  await btn.click();
  const menu = page.locator('[data-menu]');
  await expect(menu).toBeVisible();
  await expect(page.locator('[data-menu-close]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(btn).toBeFocused();
});

test('desktop navigation reaches every main section', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only');
  await page.goto('/');
  const links: [string, string][] = [
    ['Videos', '/videos/'],
    ['Stories', '/stories/'],
    ['Projekte', '/projekte/'],
    ['Über mich', '/ueber-mich/'],
  ];
  for (const [label, url] of links) {
    await page.locator('nav[aria-label="Hauptnavigation"]').getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${url}$`));
    await expect(page.locator(`nav[aria-label="Hauptnavigation"] a[aria-current="page"]`)).toHaveText(label);
  }
});

test('topic filter narrows the moments list', async ({ page }) => {
  await page.goto('/momente/');
  const all = await page.locator('#moment-list > li:not([hidden])').count();
  await page.locator('[data-filter] button[data-topic="agrardrohnen"]').click();
  const filtered = await page.locator('#moment-list > li:not([hidden])').count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(all);
  await page.locator('[data-filter] button[data-topic=""]').click();
  await expect(page.locator('#moment-list > li:not([hidden])')).toHaveCount(all);
});

test('ambient loops stay off with reduced motion', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const loaded = await page.evaluate(() => [...document.querySelectorAll('video[data-loop]')].some((v) => (v as HTMLVideoElement).dataset.loaded));
  expect(loaded).toBe(false);
  await ctx.close();
});

test('ambient loop starts when motion is allowed', async ({ page, isMobile }) => {
  test.skip(isMobile, 'covered on desktop');
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const loaded = await page.evaluate(() => [...document.querySelectorAll('video[data-loop]')].some((v) => (v as HTMLVideoElement).dataset.loaded));
  expect(loaded).toBe(true);
});

test('story page: reading aids, video link and share', async ({ page }) => {
  await page.goto('/stories/mit-19-nach-uruguay/');
  await expect(page.locator('.summary')).toBeVisible();
  await expect(page.locator('#video')).toBeVisible();
  await expect(page.getByRole('button', { name: /Link kopieren/ })).toBeVisible();
  await expect(page.locator('details').first()).toBeVisible();
  await page.locator('details summary').first().click();
  await expect(page.locator('details[open]')).toHaveCount(1);
});

test('no YouTube request before the visitor clicks play', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname)) external.push(u.hostname);
  });
  await page.goto('/videos/mein-erstes-video-aus-uruguay/', { waitUntil: 'networkidle' });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(external).toEqual([]);
});
