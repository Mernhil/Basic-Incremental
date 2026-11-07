import type { HpBarState } from '../../../game';
import { COPY } from '../copy';

/** Number of colours the stacked bars cycle through (see --bi-hp-0..5 in base.css). */
const PALETTE = 6;

export interface HpStackView {
  el: HTMLElement;
  /** `overall` is total HP as a fraction of max (0..1), for assistive tech. */
  update(state: HpBarState, hpText: string, maxText: string, overall: number): void;
}

/**
 * Stacked boss HP: the current bar drains over the colour of the next one, with "×N" bars left
 * beside it. When a bar empties, the next one becomes current without a transition.
 */
export function createHpStack(): HpStackView {
  const el = document.createElement('div');
  el.className = 'bi-hpstack';
  el.innerHTML = `
    <div class="bi-hpstack__row" role="meter" aria-valuemin="0" aria-valuemax="100">
      <div class="bi-hpstack__track"><div class="bi-hpstack__under"></div><div class="bi-hpstack__fill"></div></div>
      <span class="bi-hpstack__count bi-num" aria-hidden="true"></span>
    </div>
    <span class="bi-hpstack__text bi-num" aria-hidden="true"></span>`;
  const row = el.querySelector<HTMLElement>('.bi-hpstack__row')!;
  const under = el.querySelector<HTMLElement>('.bi-hpstack__under')!;
  const fill = el.querySelector<HTMLElement>('.bi-hpstack__fill')!;
  const count = el.querySelector<HTMLElement>('.bi-hpstack__count')!;
  const text = el.querySelector<HTMLElement>('.bi-hpstack__text')!;
  let lastIndex = -1;

  return {
    el,
    update(state, hpText, maxText, overall) {
      const color = (i: number) => `var(--bi-hp-${((i % PALETTE) + PALETTE) % PALETTE})`;
      if (state.index !== lastIndex) {
        // new bar: jump straight to its fill level instead of animating back up
        fill.style.transition = 'none';
        void fill.offsetWidth;
        lastIndex = state.index;
      } else {
        fill.style.transition = '';
      }
      fill.style.background = color(state.index);
      fill.style.width = `${(state.fraction * 100).toFixed(2)}%`;
      under.style.background = state.remaining > 1 ? color(state.index - 1) : 'transparent';
      count.textContent = COPY.hp.bars(state.remaining);
      text.textContent = COPY.hp.value(hpText, maxText);
      row.setAttribute('aria-valuenow', String(Math.round(overall * 100)));
      row.setAttribute('aria-label', COPY.hp.label(hpText, maxText, state.remaining));
    },
  };
}
