// Screenshots option combinations of a mockup page that has a picker.
// Usage: node design/explorations/shoot-options.mjs <page> <name>=<hash> [<name>=<hash> ...]
// e.g.   node design/explorations/shoot-options.mjs c2-gilded-nocturne minimal=table=navy\&ornament=minimal
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'screens');
mkdirSync(out, { recursive: true });

const [pageName, ...rest] = process.argv.slice(2);
if (!pageName || rest.length === 0) throw new Error('Usage: shoot-options.mjs <page> <name>=<hash> ...');
const combos = rest.map((arg) => {
  const i = arg.indexOf('=');
  return [arg.slice(0, i), arg.slice(i + 1)];
});

const browser = await chromium.launch();
for (const [name, hash] of combos) {
  const page = await browser.newPage({ viewport: { width: 1320, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(join(here, `${pageName}.html`)).href}#${hash}`);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '.picker { display: none !important; }' });
  await page.evaluate(() => {
    const hit = new Set(['pop-ring', 'squash', 'slash', 'jolt', 'scan', 'flash']);
    for (const a of document.getAnimations()) {
      a.pause();
      const n = a.animationName;
      const frame = a.effect?.target?.closest?.('[data-t]');
      a.currentTime = frame ? Number(frame.dataset.t) : hit.has(n) ? 160 : n === 'tick-rise' ? 600 : 1200;
    }
  });
  await page.screenshot({ path: join(out, `${pageName}-${name}.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log('done');
