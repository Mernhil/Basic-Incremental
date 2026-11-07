// Accessibility audit of the dev gallery (needs `npm run dev` running).
// - Text contrast for every table x border x rarity combination (worst case over gradient stops)
// - Reduced motion: no infinite animation may keep running
// - Keyboard: every control reachable by Tab
// Usage: node scripts/a11y-audit.mjs [url]
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5173/#gallery';
const TABLES = ['gn_table', 'gt_table'];
const BORDERS = ['gn_border', 'gt_border', 'gilded_plate'];
const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic', 'exotic', 'void'];
const CHECKS = [
  '.bi-card__name',
  '.bi-card__job',
  '.bi-card__stats dt',
  '.bi-card__stats dd',
  '.bi-rank-name',
  '.gallery__h2',
  '.gallery__fig figcaption',
  '.gallery__field > span',
  '.gallery__note',
];

function measure(selectors) {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (k) => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
    return { r: mix('r'), g: mix('g'), b: mix('b'), a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const layersOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const list = [n];
      if (n.classList?.contains('bi-card')) {
        const rarity = n.querySelector(':scope > .bi-card__rarity');
        if (rarity) list.unshift(rarity);
      }
      for (const node of list) {
        const cs = getComputedStyle(node);
        const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0]));
        layers.push({ color: parse(cs.backgroundColor), stops });
      }
    }
    return layers.reverse(); // bottom first
  };
  const backgrounds = (el) => {
    let candidates = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (const { color, stops } of layersOf(el)) {
      if (color && color.a > 0) candidates = candidates.map((c) => over(color, c));
      if (stops.length) {
        const next = [];
        for (const c of candidates) for (const s of stops) next.push(over(s, c));
        candidates = next.slice(0, 64);
      }
    }
    return candidates;
  };
  const out = {};
  for (const sel of selectors) {
    let worst = Infinity;
    let sample = '';
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      if (!fg || fg.a === 0 || el.getClientRects().length === 0) continue; // gradient-clipped or hidden text
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      for (const bg of backgrounds(el)) {
        const r = ratio(fg, bg) / (large ? 3 / 4.5 : 1); // normalise large text to the 4.5 scale
        if (r < worst) {
          worst = r;
          sample = `${cs.color} on rgb(${bg.r.toFixed(0)}, ${bg.g.toFixed(0)}, ${bg.b.toFixed(0)})${large ? ' (large)' : ''}`;
        }
      }
    }
    if (worst !== Infinity) out[sel] = { ratio: Number(worst.toFixed(2)), sample };
  }
  return out;
}

const browser = await chromium.launch();
const failures = [];
let checked = 0;

// ---- contrast ----
const page = await browser.newPage({ viewport: { width: 1320, height: 1000 } });
for (const table of TABLES) {
  for (const border of BORDERS) {
    for (const rarity of RARITIES) {
      await page.goto(url.replace('#', `?c=${table}-${border}-${rarity}#`));
      await page.waitForSelector('.bi-card');
      await page.selectOption('[data-testid="pick-table"]', table);
      await page.selectOption('[data-testid="pick-border"]', border);
      await page.selectOption('[data-testid="pick-rarity"]', rarity);
      const result = await page.evaluate(measure, CHECKS);
      checked++;
      for (const [sel, { ratio, sample }] of Object.entries(result)) {
        if (ratio < 4.5) failures.push(`${table} + ${border} + ${rarity}: ${sel} ${ratio}:1 (${sample})`);
      }
    }
  }
}
await page.close();

// ---- reduced motion ----
const rm = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1320, height: 1000 } });
const rmPage = await rm.newPage();
await rmPage.goto(url.replace('#', '?rm=1#'));
await rmPage.waitForSelector('.bi-card');
await rmPage.selectOption('[data-testid="pick-border"]', 'gilded_filigree');
await rmPage.selectOption('[data-testid="level-border"]', '3');
await rmPage.selectOption('[data-testid="pick-finish"]', 'aurora_veil');
await rmPage.selectOption('[data-testid="level-finish"]', '3');
await rmPage.waitForTimeout(1500);
const looping = await rmPage.evaluate(
  () =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity)
      .map((a) => a.animationName ?? 'unknown'),
);
const hits = await rmPage.evaluate(() => document.querySelectorAll('.bi-fx').length);

// ---- keyboard ----
const controls = await rmPage.evaluate(() => document.querySelectorAll('select, button').length);
const reached = new Set();
for (let i = 0; i < controls + 2; i++) {
  await rmPage.keyboard.press('Tab');
  const tag = await rmPage.evaluate(() => {
    const el = document.activeElement;
    const visible = el && getComputedStyle(el).outlineStyle !== 'none';
    return el ? `${el.tagName}:${el.dataset?.testid ?? el.textContent?.trim().slice(0, 20)}:${visible}` : '';
  });
  reached.add(tag);
}
await browser.close();

console.log(`Contrast: ${checked} combinations checked, ${failures.length} failures`);
for (const f of failures.slice(0, 40)) console.log('  FAIL', f);
console.log(`Reduced motion: ${looping.length} infinite animations running`, looping.slice(0, 10));
console.log(`Reduced motion: ${hits} hit effects spawned (expected 0)`);
console.log(`Keyboard: ${controls} controls, reached ${[...reached].filter(Boolean).length} by Tab`);
console.log('  without visible focus:', [...reached].filter((t) => t.endsWith(':false')));
