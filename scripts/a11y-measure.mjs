// Shared by the a11y audits. Runs inside the page (pass it to page.evaluate): for each selector,
// the worst text contrast over every background layer and gradient stop behind it.
export function measure(selectors) {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
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
