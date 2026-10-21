// Renders the PWA icons and the social preview image into public/, using headless Chromium.
// Icons come from the extension's images/icon.svg; the OG image shows real artworks from the engine.
//
//   ARTIFY_DIR=/path/to/artify npm run build:images

import { chromium } from '@playwright/test';
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compose, ANIMATION_CSS } from '../src/vendor/artify-engine.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artify = resolve(process.env.ARTIFY_DIR || join(root, '..', 'artify'));
const pub = join(root, 'public');
const tokens = Object.fromEntries([...readFileSync(join(root, 'src/styles/tokens.css'), 'utf8').matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
const icon = readFileSync(join(artify, 'images', 'icon.svg'), 'utf8');

copyFileSync(join(artify, 'images', 'icon.svg'), join(pub, 'favicon.svg'));

const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(html, width, height, file) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`);
  await page.screenshot({ path: join(pub, file), omitBackground: false });
  console.log('Wrote public/' + file);
}

const sized = (svg, size) => svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);

for (const size of [192, 512]) await shot(sized(icon, size), size, size, `icon-${size}.png`);
await shot(`<div style="width:180px;height:180px;background:${tokens.bg}">${sized(icon, 180)}</div>`, 180, 180, 'apple-touch-icon.png');
// Maskable: full-bleed ground, with the logo inside the 80% safe zone.
await shot(`<div style="width:512px;height:512px;background:${tokens.bg};display:grid;place-items:center">${sized(icon, 410)}</div>`, 512, 512, 'icon-maskable-512.png');

// Social card: wordmark and line on the left, three artworks on the right.
const arts = [
  compose('dark', 4127, 'animals').svg,
  compose('dark', 2026, 'abstract').svg,
  compose('dark', 813, 'space').svg
].map((svg) => `<div style="width:220px;height:348px;padding:6px;background:${tokens.surface};border-radius:14px">${svg.replace('<svg ', '<svg style="width:100%;height:100%" ')}</div>`);
await shot(
  `<style>${ANIMATION_CSS} .s,.f{animation:none!important}</style>
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:64px 72px;background:${tokens.bg};display:flex;align-items:center;gap:56px;font-family:system-ui,sans-serif">
    <div style="flex:0 0 470px;color:${tokens.fg}">
      <div style="font-weight:900;letter-spacing:.32em;font-size:28px;color:${tokens.accent}">ARTIFY</div>
      <div style="margin-top:24px;font-size:58px;line-height:1.05;font-weight:800;letter-spacing:-.02em">Tap for endless<br>shard art.</div>
      <div style="margin-top:24px;font-size:24px;line-height:1.4;color:${tokens['fg-muted']}">Solve it as a puzzle, throw paint,<br>or build your own.</div>
    </div>
    <div style="display:flex;gap:18px;transform:rotate(-4deg)">${arts.join('')}</div>
  </div>`,
  1200, 630, 'og-image.png'
);

// Android (Capacitor): launcher icons, adaptive-icon foregrounds and splash screens, replacing the template's.
const res = join(root, 'android', 'app', 'src', 'main', 'res');
if (existsSync(res)) {
  const bare = icon.replace(/<rect width="512" height="512"[^>]*\/>/, ''); // logo without its rounded ground
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const shotTo = async (html, w, h, path) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`);
    await page.screenshot({ path, omitBackground: true });
  };
  for (const [d, px] of Object.entries(densities)) {
    const dir = join(res, 'mipmap-' + d);
    await shotTo(sized(icon, px), px, px, join(dir, 'ic_launcher.png'));
    await shotTo(`<div style="width:${px}px;height:${px}px;border-radius:50%;overflow:hidden;background:${tokens.bg};display:grid;place-items:center">${sized(bare, Math.round(px * 0.92))}</div>`, px, px, join(dir, 'ic_launcher_round.png'));
    // Adaptive icons are 108 dp with a 66 dp safe zone in the middle.
    const fg = Math.round(px * 2.25);
    await shotTo(`<div style="width:${fg}px;height:${fg}px;display:grid;place-items:center">${sized(bare, Math.round(fg * 0.62))}</div>`, fg, fg, join(dir, 'ic_launcher_foreground.png'));
  }
  for (const dir of readdirSync(res).filter((n) => n.startsWith('drawable'))) {
    const file = join(res, dir, 'splash.png');
    if (!existsSync(file)) continue;
    const [w, h] = (await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, 'data:image/png;base64,' + readFileSync(file).toString('base64')));
    const logo = Math.round(Math.min(w, h) * 0.32);
    await shotTo(`<div style="width:${w}px;height:${h}px;background:${tokens.bg};display:grid;place-items:center">${sized(bare, logo)}</div>`, w, h, file);
  }
  const bgXml = join(res, 'values', 'ic_launcher_background.xml');
  writeFileSync(bgXml, readFileSync(bgXml, 'utf8').replace(/#[0-9A-Fa-f]{6}/, tokens.bg));
  console.log('Wrote Android launcher icons and splash screens');
}

await browser.close();
