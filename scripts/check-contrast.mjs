// Checks WCAG contrast for every text/surface pair the web app uses, read straight from tokens.css.
// Same rule as the extension's scripts/check-contrast.js: text needs 4.5:1, icons and focus rings 3:1.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src', 'styles', 'tokens.css'), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));

const TEXT = 4.5;
const UI = 3;

function luminance(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [];
const add = (fg, bg, min = TEXT, label = `${fg} on ${bg}`) => pairs.push({ fg, bg, min, label });

for (const bg of ['bg', 'bg-deep', 'surface', 'teal-deep', 'hover']) {
  add('fg', bg);
  add('fg-muted', bg);
}
add('accent', 'bg-deep', TEXT, 'active nav label');
add('accent', 'bg', TEXT, 'ochre text on page');
add('accent', 'surface', TEXT, 'ochre text on sheets');
add('link', 'bg');
add('link', 'surface');
add('link', 'bg-deep');
add('on-accent', 'accent', TEXT, 'primary button text');
add('on-accent', 'accent-hover', TEXT, 'primary button text on hover');
add('brick', 'surface', UI, 'destructive icon on sheets');
add('brick', 'bg', UI, 'destructive icon on page');
add('accent', 'bg', UI, 'focus ring on page');
add('accent', 'surface', UI, 'focus ring on sheets');

let failures = 0;
for (const { fg, bg, min, label } of pairs) {
  if (!tokens[fg] || !tokens[bg]) {
    console.log(` MISSING  --${fg} or --${bg}`);
    failures++;
    continue;
  }
  const r = ratio(tokens[fg], tokens[bg]);
  const ok = r >= min;
  if (!ok) failures++;
  if (!ok || process.argv.includes('--verbose')) console.log(`${ok ? '  ok  ' : ' FAIL '} ${r.toFixed(2).padStart(5)}  ${label}  (--${fg} ${tokens[fg]} on --${bg} ${tokens[bg]}, needs ${min})`);
}
console.log(failures ? `\n${failures} pair(s) below their minimum` : `\nAll ${pairs.length} pairs pass`);
process.exit(failures ? 1 : 0);
