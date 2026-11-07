// Screenshots the three mockups with animations frozen at a known frame.
// Usage: node design/explorations/shoot.mjs [outDir]
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? join(here, 'screens');
mkdirSync(out, { recursive: true });

const pages = ['a-flatland', 'b-gilded', 'c-nocturne'];
const FREEZE_MS = 1200;

const browser = await chromium.launch();
for (const name of pages) {
  const page = await browser.newPage({ viewport: { width: 1320, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(join(here, `${name}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const hit = new Set(["pop-ring", "squash", "slash", "jolt", "scan", "flash"]);
    for (const a of document.getAnimations()) {
      a.pause();
      const n = a.animationName;
      a.currentTime = hit.has(n) ? 160 : n === "tick-rise" ? 600 : 1200;
    }
  });
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true, scale: "css" });

  // close-up of the star-5 vs star-6 pair
  const box = await page.locator("section").nth(2).locator(".card").evaluateAll((els) => {
    const [a, b] = els.slice(0, 2).map((el) => el.getBoundingClientRect());
    return { x: a.x + scrollX, y: a.y + scrollY, w: b.right - a.x, h: a.height };
  });
  await page.screenshot({
    path: join(out, `${name}-star6.png`),
    fullPage: true,
    scale: "css",
    clip: { x: box.x - 14, y: box.y - 14, width: box.w + 28, height: box.h + 28 },
  });
  // 3x strip of the rank footers: gold star 5, gold star 6, bronze star 6, prismatic star 6
  const strip = await page.locator("section").nth(2).locator(".card").evaluateAll((els) => {
    const rects = els.slice(0, 4).map((el) => el.querySelector(".card__rank").getBoundingClientRect());
    const x = Math.min(...rects.map((r) => r.x)) + scrollX;
    const right = Math.max(...rects.map((r) => r.right)) + scrollX;
    return { x, y: rects[0].y + scrollY, w: right - x, h: rects[0].height };
  });
  await page.screenshot({
    path: join(out, name + "-stars.png"),
    fullPage: true,
    scale: "device",
    clip: { x: strip.x - 6, y: strip.y - 6, width: strip.w + 12, height: strip.h + 12 },
  });
  await page.close();
}
await browser.close();
console.log('screenshots in', out);
