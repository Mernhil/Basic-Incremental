// Screenshots the dev-only card gallery from a running dev server (npm run dev).
// Usage: node scripts/shoot-gallery.mjs [outDir] [url]
// Each shot can equip cosmetics first through the gallery pickers.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const out = process.argv[2] ?? 'design/gallery-screens';
const url = process.argv[3] ?? 'http://localhost:5173/#gallery';
mkdirSync(out, { recursive: true });

/** name, picks (testid -> value), what to capture ('evolution' | 'page' | section index) */
const shots = [
  { name: 'evolution-starter', picks: {}, capture: 0 },
  {
    name: 'evolution-filigree3-aurora3',
    picks: {
      'pick-border': 'gilded_filigree',
      'level-border': '3',
      'pick-finish': 'aurora_veil',
      'level-finish': '3',
    },
    capture: 0,
  },
  { name: 'evolution-dark-table', picks: { 'pick-table': 'gt_table' }, capture: 0 },
  { name: 'gold-row-star1-6', picks: {}, capture: 3 },
  { name: 'prismatic-row-star1-6', picks: {}, capture: 4 },
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1320, height: 1000 },
  deviceScaleFactor: 2,
});
for (const shot of shots) {
  await page.goto(url.replace('#', `?shot=${shot.name}#`));
  await page.waitForSelector('.bi-card');
  await page.evaluate(() => document.fonts.ready);
  for (const [testid, value] of Object.entries(shot.picks)) {
    await page.selectOption(`[data-testid="${testid}"]`, value);
  }
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = 1200;
    }
  });
  const target =
    shot.capture === 'page' ? page : page.locator('.gallery__section').nth(shot.capture);
  await target.screenshot({
    path: join(out, `${shot.name}.png`),
    ...(shot.capture === 'page' ? { fullPage: true } : {}),
  });
}
await browser.close();
console.log('screenshots in', out);
