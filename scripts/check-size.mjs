// Checks the built JavaScript against the performance budget in PLAN.md §8: if the gzipped engine plus
// app goes over 200 KB, it is time to split the engine per category with dynamic import().

import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUDGET_KB = 200;
const assets = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'dist', 'assets');

let total = 0;
for (const file of readdirSync(assets).filter((f) => /\.(js|css)$/.test(f))) {
  const kb = gzipSync(readFileSync(join(assets, file)), { level: 9 }).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} KB  ${file}`);
}
console.log(`${total.toFixed(1).padStart(7)} KB  total gzipped (budget ${BUDGET_KB} KB)`);
process.exit(total > BUDGET_KB ? 1 : 0);
