import { test, expect } from '@playwright/test';

const artLabel = (page) => page.locator('#art svg title').textContent();
const ready = (page) => expect(page).toHaveURL(/#\/art\/\w+\/\w+\/\d+$/);
const tapArt = (page, isMobile) => (isMobile ? page.locator('#art').tap() : page.locator('#art').click());

test.beforeEach(async ({ page }) => {
  // Nothing may leave the origin: no trackers, fonts or CDNs.
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data') && !url.protocol.startsWith('blob')) {
      throw new Error('Third-party request: ' + req.url());
    }
  });
  page.on('pageerror', (e) => {
    throw e;
  });
});

test('loads straight into an artwork with a shareable link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#art svg')).toBeVisible();
  await expect(page).toHaveURL(/#\/art\/all\/\w+\/\d+$/);
  await expect(page.locator('#hint')).toBeVisible();
});

test('tap reforms, back returns, and the hint goes away', async ({ page, isMobile }) => {
  await page.goto('/');
  await ready(page);
  const first = page.url();
  await tapArt(page, isMobile);
  await expect(page).not.toHaveURL(first);
  await expect(page.locator('#hint')).toBeHidden();
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(first);
});

test('a deep link reproduces the exact artwork without dealing', async ({ page, browser }) => {
  await page.goto('/');
  await ready(page);
  const url = page.url();
  const svg = await page.locator('#art').innerHTML();
  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.locator('#art svg')).toBeVisible();
  expect(await other.locator('#art').innerHTML()).toBe(svg);
  await other.close();
});

test('save survives a reload and shows in Saved', async ({ page }) => {
  await page.goto('/');
  const name = await artLabel(page);
  await page.locator('#r-save').click();
  await expect(page.locator('#r-save')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('#r-save')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/saved');
  await expect(page.locator('#saved-designs .thumb')).toHaveCount(1);
  await expect(page.locator('#saved-designs .thumb')).toHaveAttribute('aria-label', new RegExp(name.split(' ')[0]));
});

test('categories change what is dealt', async ({ page }) => {
  await page.goto('/');
  await page.locator('.chip[data-category="space"]').click();
  await expect(page).toHaveURL(/#\/art\/space\//);
});

test('puzzle can be solved and moves on', async ({ page }) => {
  await page.goto('/#/puzzle');
  await expect(page.locator('#status')).toContainText('pieces placed');
  await page.locator('#p-answer').click();
  await expect(page.locator('#win')).toBeVisible();
  const before = await page.locator('#board').innerHTML();
  await page.locator('#win-next').click();
  await expect(page.locator('#win')).toBeHidden();
  expect(await page.locator('#board').innerHTML()).not.toBe(before);
});

test('splash paints and saves a painting', async ({ page }) => {
  await page.goto('/#/splash');
  const box = await page.locator('#paint').boundingBox();
  await page.mouse.move(box.x + 60, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 200, { steps: 8 });
  await page.mouse.up();
  await page.locator('#s-save').click();
  await expect(page.locator('#toast')).toContainText('Painting saved');
  await page.goto('/#/saved');
  await expect(page.locator('#saved-paintings .thumb')).toHaveCount(1);
});

test('studio builds a design that comes up in Saved and as a category', async ({ page, isMobile }) => {
  await page.goto('/#/studio');
  if (isMobile) await page.locator('#t-add').click();
  await page.locator('.shape-btn').first().click();
  await expect(page.locator('#studio .item')).toHaveCount(1);
  await page.locator('#t-save').click();
  await expect(page.locator('#toast')).toContainText('Saved');
  await page.goto('/#/saved');
  await expect(page.locator('#saved-creations .thumb')).toHaveCount(1);
  await page.goto('/#/reform');
  await expect(page.locator('.chip[data-category="mine"]')).toBeVisible();
});

test('deleting in Saved can be undone', async ({ page }) => {
  await page.goto('/');
  await page.locator('#r-save').click();
  await page.goto('/#/saved');
  await page.locator('#saved-designs .thumb').click();
  await page.locator('dialog.viewer [data-act="delete"]').click();
  await expect(page.locator('#saved-designs .thumb')).toHaveCount(0);
  await page.locator('#toast-action').click();
  await expect(page.locator('#saved-designs .thumb')).toHaveCount(1);
});

test('backup export and import round-trip', async ({ page }) => {
  await page.goto('/');
  await page.locator('#r-save').click();
  await page.goto('/#/saved');
  const download = page.waitForEvent('download');
  await page.locator('#export-all').click();
  const file = await (await download).path();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#saved-designs .thumb')).toHaveCount(0);
  await page.locator('#import-file').setInputFiles(file);
  await expect(page.locator('#toast')).toContainText('Restored 1 design');
  await expect(page.locator('#saved-designs .thumb')).toHaveCount(1);
});

test('every icon-only control has an accessible name and a 44 px target', async ({ page }) => {
  for (const mode of ['reform', 'puzzle', 'splash', 'studio']) {
    await page.goto('/#/' + mode);
    const bad = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button.icon, .swatch, .chip'))
        .filter((b) => b.offsetParent !== null)
        .map((b) => {
          const r = b.getBoundingClientRect();
          const name = b.getAttribute('aria-label') || b.textContent.trim();
          // Chips have an invisible hit area that extends them to 44 px.
          const h = b.classList.contains('chip') ? r.height + 8 : r.height;
          return !name || r.width < 44 || h < 44 ? b.id || b.className : null;
        })
        .filter(Boolean)
    );
    expect(bad, mode).toEqual([]);
  }
});
