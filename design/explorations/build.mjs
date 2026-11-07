// Builds the three standalone style mockups from one shared markup, so every direction
// shows exactly the same content. Run: node design/explorations/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(here, name), 'utf8');

const fontFile = (pkg, file) => `../../node_modules/@fontsource/${pkg}/files/${file}.woff2`;
const face = (family, pkg, weight, style = 'normal') =>
  `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;` +
  `src:url('${fontFile(pkg, `${pkg}-latin-${weight}-${style}`)}') format('woff2')}`;

const directions = [
  {
    file: 'a-flatland.html',
    css: 'a-flatland.css',
    name: 'Flatland Ink',
    blurb: 'Clean flat: solid colour, hard outlines, no gradients.',
    fonts: [face('Bricolage Grotesque', 'bricolage-grotesque', 500), face('Bricolage Grotesque', 'bricolage-grotesque', 700), face('Bricolage Grotesque', 'bricolage-grotesque', 800)],
    slots: [
      ['Card border', 'Ink outline'],
      ['Card finish', 'Stripe holo'],
      ['Attack animation', 'Pop ring'],
      ['Tick damage', 'Sticker pill'],
      ['Number style', 'Rounded heavy'],
      ['Table', 'Dot grid'],
    ],
  },
  {
    file: 'b-gilded.html',
    css: 'b-gilded.css',
    name: 'Gilded Tradition',
    blurb: 'Classic trading card: coloured frame, gold plate, felt table.',
    fonts: [
      face('Alegreya', 'alegreya', 400),
      face('Alegreya', 'alegreya', 700),
      face('Alegreya', 'alegreya', 400, 'italic'),
      face('Alegreya', 'alegreya', 700, 'italic'),
      face('Alegreya Sans', 'alegreya-sans', 400),
      face('Alegreya Sans', 'alegreya-sans', 500),
      face('Alegreya Sans', 'alegreya-sans', 700),
    ],
    slots: [
      ['Card border', 'Crimson and gilt'],
      ['Card finish', 'Rainbow foil'],
      ['Attack animation', 'Gilt slash'],
      ['Tick damage', 'Engraved rise'],
      ['Number style', 'Engraved gold'],
      ['Table', 'Green felt'],
    ],
  },
  {
    file: 'c-nocturne.html',
    css: 'c-nocturne.css',
    name: 'Nocturne Frost',
    blurb: 'Dark minimal: hairlines, quiet type, light only where it matters.',
    fonts: [face('Instrument Sans', 'instrument-sans', 400), face('Instrument Sans', 'instrument-sans', 500), face('Instrument Sans', 'instrument-sans', 600)],
    slots: [
      ['Card border', 'Hairline frost'],
      ['Card finish', 'Thin-film iridescence'],
      ['Attack animation', 'Scan beam'],
      ['Tick damage', 'Ice drift'],
      ['Number style', 'Light tabular'],
      ['Table', 'Midnight grid'],
    ],
  },
  {
    file: 'b2-gilded-options.html',
    css: 'b-gilded.css',
    extraCss: ['b2-options.css'],
    controls: true,
    name: 'Gilded Tradition options',
    blurb: 'Same cosmetic items, new table and fonts. Use the picker to mix.',
    fonts: [
      face('Marcellus', 'marcellus', 400),
      face('Barlow Semi Condensed', 'barlow-semi-condensed', 500),
      face('Barlow Semi Condensed', 'barlow-semi-condensed', 600),
      face('Barlow Semi Condensed', 'barlow-semi-condensed', 700),
      face('Spectral', 'spectral', 400),
      face('Spectral', 'spectral', 700),
      face('Spectral', 'spectral', 700, 'italic'),
      face('Source Sans 3', 'source-sans-3', 400),
      face('Source Sans 3', 'source-sans-3', 600),
      face('Source Sans 3', 'source-sans-3', 700),
      face('Outfit', 'outfit', 500),
      face('Outfit', 'outfit', 700),
      face('Outfit', 'outfit', 800),
    ],
    slots: [
      ['Card border', 'Crimson and gilt'],
      ['Card finish', 'Rainbow foil'],
      ['Attack animation', 'Gilt slash'],
      ['Tick damage', 'Engraved rise'],
      ['Number style', 'Engraved gold'],
      ['Table', 'Plain (pick below)'],
    ],
  },
  {
    file: 'c2-gilded-nocturne.html',
    css: 'd-hybrid.css',
    controls: 'hybrid',
    name: 'Gilded Nocturne',
    blurb: 'Gilded items on a calm Nocturne structure. Outfit throughout.',
    fonts: [
      face('Outfit', 'outfit', 500),
      face('Outfit', 'outfit', 600),
      face('Outfit', 'outfit', 700),
      face('Outfit', 'outfit', 800),
    ],
    slots: [
      ['Card border', 'Gilt hairline'],
      ['Card finish', 'Rainbow foil'],
      ['Attack animation', 'Gilt slash'],
      ['Tick damage', 'Engraved rise'],
      ['Number style', 'Engraved gold'],
      ['Table', 'Plain (pick below)'],
    ],
  },
];

// ---- tiny flat emblems used as art placeholders -------------------------------------------
const emblems = {
  blade: '<path d="M50 8 62 60 50 70 38 60Z"/><rect x="30" y="64" width="40" height="7" rx="2"/><rect x="45" y="70" width="10" height="22" rx="2"/>',
  pick: '<path d="M12 40C30 14 70 14 88 40 70 30 30 30 12 40Z"/><rect x="46" y="30" width="8" height="62" rx="3"/>',
  axe: '<path d="M30 20C62 8 84 26 76 52 60 44 44 42 30 50Z"/><rect x="26" y="20" width="8" height="72" rx="3"/>',
  shield: '<path d="M50 8 84 20V48C84 70 68 84 50 92 32 84 16 70 16 48V20Z"/>',
  gem: '<path d="M30 16H70L90 40 50 90 10 40Z"/>',
  drum: '<ellipse cx="50" cy="32" rx="34" ry="12"/><path d="M16 32V70C16 78 32 86 50 86S84 78 84 70V32C84 40 68 44 50 44S16 40 16 32Z"/>',
  golem: '<rect x="22" y="20" width="56" height="48" rx="8"/><rect x="34" y="72" width="12" height="18" rx="3"/><rect x="54" y="72" width="12" height="18" rx="3"/>',
};
const art = (kind) =>
  `<svg class="art__emblem" viewBox="0 0 100 100" aria-hidden="true">${emblems[kind]}</svg>`;

// ---- markup ---------------------------------------------------------------------------------
const TIER_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', prismatic: 'Prismatic' };

function stars(tier, count) {
  const on = '★'.repeat(count);
  const off = '★'.repeat(6 - count);
  const label = `${TIER_NAME[tier]}, ${count} of 6 stars`;
  return (
    `<span class="stars" role="img" aria-label="${label}">` +
    `<span class="stars__on" aria-hidden="true">${on}</span>` +
    `<span class="stars__sheen" aria-hidden="true">${on}</span>` +
    `<span class="stars__off" aria-hidden="true">${off}</span></span>`
  );
}

function card({ name, job, role, emblem, tone, tier, count, power, rate, extra = '', finish = '', cls = '' }) {
  const six = count === 6 ? ' is-star6' : '';
  return `
  <article class="card rank-${tier}${six} job-${job.toLowerCase()} tone-${tone}${finish ? ` finish-${finish}` : ''} ${cls}">
    <header class="card__head"><h3 class="card__name">${name}</h3><span class="card__job">${role ?? job}</span></header>
    <div class="card__art">${art(emblem)}</div>
    <dl class="card__stats">
      <div><dt>Power</dt><dd class="num">${power}</dd></div>
      <div><dt>${extra ? extra[0] : 'Rate'}</dt><dd class="num">${extra ? extra[1] : rate}</dd></div>
    </dl>
    <footer class="card__rank"><span class="rank-name">${TIER_NAME[tier]}</span>${stars(tier, count)}</footer>
  </article>`;
}

function boss() {
  return `
  <article class="card card--boss tone-boss rank-gold" aria-label="Boss: Stone Warden">
    <header class="card__head"><h3 class="card__name">Stone Warden</h3><span class="card__job">Boss</span></header>
    <div class="card__art"><div class="fx" aria-hidden="true"></div>${art('golem')}
      <div class="ticks" aria-hidden="true">
        <span class="tick num" style="--x:22%;animation-delay:0s">1.2K</span>
        <span class="tick num" style="--x:58%;animation-delay:-.2s">1.2K</span>
        <span class="tick tick--crit num" style="--x:38%;animation-delay:-.45s">8.4K</span>
        <span class="tick num" style="--x:72%;animation-delay:-.65s">1.2K</span>
        <span class="tick num" style="--x:12%;animation-delay:-.85s">1.2K</span>
      </div>
    </div>
    <div class="hp" role="progressbar" aria-label="Boss HP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="68">
      <div class="hp__fill" style="width:68%"></div>
      <span class="hp__text num">6.8M / 10M</span>
    </div>
  </article>`;
}

// Mockup-only picker so table and font options can be mixed. Reads and writes the URL hash.
const PICKER_SCRIPT = `
(() => {
  const params = new URLSearchParams(location.hash.slice(1));
  const apply = (key, value) => {
    document.body.dataset[key] = value;
    for (const b of document.querySelectorAll('.picker [data-key="' + key + '"]')) {
      b.setAttribute('aria-pressed', String(b.dataset.value === value));
    }
  };
  const keys = document.querySelector('.picker').dataset.keys.split(',');
  for (const key of keys) apply(key, params.get(key) ?? document.body.dataset[key]);
  document.querySelector('.picker').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    apply(b.dataset.key, b.dataset.value);
    params.set(b.dataset.key, b.dataset.value);
    history.replaceState(null, '', '#' + params);
  });
})();`;

const TABLES = [
  ['navy', 'Ink navy'],
  ['graphite', 'Graphite'],
  ['stone', 'Light stone'],
];

function picker(kind) {
  const group = (key, label, items) =>
    `<fieldset><legend>${label}</legend>` +
    items
      .map(([v, t]) => `<button type="button" data-key="${key}" data-value="${v}">${t}</button>`)
      .join('') +
    '</fieldset>';
  const hybrid = kind === 'hybrid';
  const fonts = group('font', 'Fonts', [
    ['inscribed', 'Inscribed'],
    ['bookish', 'Book serif'],
    ['modern', 'Modern sans'],
  ]);
  const ornament = group('ornament', 'Gilt', [
    ['minimal', 'Minimal'],
    ['medium', 'Medium'],
  ]);
  return (
    `<aside class="picker" aria-label="Options" data-keys="${hybrid ? 'table,ornament' : 'table,font'}">` +
    group('table', 'Table', TABLES) +
    (hybrid ? ornament : fonts) +
    `</aside><script>${PICKER_SCRIPT}</script>`
  );
}

function page(d) {
  const base = read('base.css');
  const own = [d.css, ...(d.extraCss ?? [])].map(read).join('\n');
  const slotList = d.slots.map(([k, v]) => `<li><span>${k}</span> <b>${v}</b></li>`).join('');

  const loadout = [
    card({ name: 'Ember Warden', job: 'Fighting', role: 'Main', emblem: 'blade', tone: 'a', tier: 'gold', count: 4, power: '12.4K', extra: ['Tick', '1.0s'] }),
    card({ name: 'Whetstone', job: 'Fighting', role: 'Support', emblem: 'gem', tone: 'b', tier: 'silver', count: 3, power: '+10%', extra: ['Adds', 'Damage'] }),
    card({ name: 'Twin Blade', job: 'Fighting', role: 'Support', emblem: 'axe', tone: 'c', tier: 'bronze', count: 5, power: '+20%', extra: ['Adds', 'Attack'] }),
    card({ name: 'War Drum', job: 'Fighting', role: 'Support', emblem: 'drum', tone: 'd', tier: 'silver', count: 1, power: '+15%', extra: ['Adds', 'Speed'] }),
  ].join('');

  const ranks = [
    card({ name: 'Stone Pick', job: 'Mining', emblem: 'pick', tone: 'c', tier: 'bronze', count: 3, power: '320', rate: '2.4/s' }),
    card({ name: 'Birch Axe', job: 'Logging', emblem: 'axe', tone: 'b', tier: 'silver', count: 4, power: '1.8K', rate: '9.1/s' }),
    card({ name: 'Gilded Edge', job: 'Fighting', emblem: 'blade', tone: 'a', tier: 'gold', count: 2, power: '9.6K', rate: '1.0s' }),
    card({ name: 'Prism Shield', job: 'Fighting', emblem: 'shield', tone: 'd', tier: 'prismatic', count: 5, power: '52K', rate: '0.8s' }),
  ].join('');

  const pair = [
    card({ name: 'Gilded Edge', job: 'Fighting', emblem: 'blade', tone: 'a', tier: 'gold', count: 5, power: '14.2K', rate: '1.0s' }),
    card({ name: 'Gilded Edge', job: 'Fighting', emblem: 'blade', tone: 'a', tier: 'gold', count: 6, power: '21.0K', rate: '0.9s' }),
  ].join('');

  const extremes = [
    card({ name: 'Stone Pick', job: 'Mining', emblem: 'pick', tone: 'c', tier: 'bronze', count: 6, power: '980', rate: '3.1/s' }),
    card({ name: 'Prism Shield', job: 'Fighting', emblem: 'shield', tone: 'd', tier: 'prismatic', count: 6, power: '88K', rate: '0.7s' }),
    card({ name: 'Aurora Fang', job: 'Fighting', emblem: 'gem', tone: 'b', tier: 'silver', count: 3, power: '3.3K', rate: '1.1s', finish: 'holo' }),
  ].join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${d.name} — style exploration</title>
<style>
${d.fonts.join('\n')}
${base}
${own}
</style>
</head>
<body class="dir"${d.controls === 'hybrid' ? ' data-table="navy" data-ornament="minimal"' : d.controls ? ' data-table="navy" data-font="inscribed"' : ''}>
<main class="table">
  <header class="setbar">
    <div><h1>${d.name}</h1><p class="blurb">${d.blurb}</p></div>
    <ul class="slots" aria-label="Cosmetic set">${slotList}</ul>
  </header>

  <section aria-labelledby="s1">
    <h2 id="s1" class="section-title">Battle</h2>
    <div class="row row--battle">${boss()}<div class="row">${loadout}</div></div>
  </section>

  <section aria-labelledby="s2">
    <h2 id="s2" class="section-title">Ranks</h2>
    <div class="row">${ranks}</div>
  </section>

  <section aria-labelledby="s3">
    <h2 id="s3" class="section-title">Star 5 and star 6, with the shine and a faint frame glow</h2>
    <div class="row">${pair}<div class="row">${extremes}</div></div>
  </section>
</main>
${d.controls ? picker(d.controls) : ''}
</body>
</html>
`;
}

for (const d of directions) {
  writeFileSync(join(here, d.file), page(d));
  console.log('wrote', d.file);
}
