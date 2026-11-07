// Screenshots the table/font option combinations of the Gilded Tradition mockup.
// Usage: node design/explorations/shoot-options.mjs
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'screens');
mkdirSync(out, { recursive: true });

const combos = [
  ['navy', 'inscribed'],
  ['graphite', 'bookish'],
  ['stone', 'modern'],
];

const browser = await chromium.launch();
for (const [table, font] of combos) {
  const page = await browser.newPage({ viewport: { width: 1320, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(join(here, 'b2-gilded-options.html')).href}#table=${table}&font=${font}`);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '.picker { display: none !important; }' });
  await page.evaluate(() => {
    const hit = new Set(['pop-ring', 'squash', 'slash', 'jolt', 'scan', 'flash']);
    for (const a of document.getAnimations()) {
      a.pause();
      const n = a.animationName;
      a.currentTime = hit.has(n) ? 160 : n === 'tick-rise' ? 600 : 1200;
    }
  });
  await page.screenshot({ path: join(out, `b2-${table}-${font}.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log('done');
