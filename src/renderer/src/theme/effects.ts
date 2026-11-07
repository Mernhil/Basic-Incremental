import type { Rng } from '../../../game';
import type { EFFECTS } from './registry';
import './effects.css';

/**
 * Animation effects keyed by the ids cosmetic data uses (see registry.ts). Each spawns DOM for
 * one hit inside a stage element and cleans up after itself. Angle and position are random per
 * hit. A cap on live nodes keeps many simultaneous hits cheap.
 */

type EffectId = (typeof EFFECTS)[number];

export interface HitOptions {
  rng: Rng;
  /** Element that flinches or thuds when hit (the boss emblem). */
  target?: Element | null;
}

const MAX_LIVE_HITS = 6;
const MAX_LIVE_TICKS = 10;

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function layer(stage: HTMLElement): HTMLElement {
  let fx = stage.querySelector<HTMLElement>(':scope > .bi-fx-layer');
  if (!fx) {
    fx = document.createElement('div');
    fx.className = 'bi-fx-layer';
    stage.append(fx);
  }
  return fx;
}

function spawn(
  stage: HTMLElement,
  cls: string,
  html: string,
  vars: Record<string, string>,
  ttlMs: number,
): void {
  const fx = layer(stage);
  while (fx.querySelectorAll('.bi-fx').length >= MAX_LIVE_HITS)
    fx.querySelector('.bi-fx')?.remove();
  const hit = document.createElement('div');
  hit.className = `bi-fx ${cls}`;
  for (const [k, v] of Object.entries(vars)) hit.style.setProperty(k, v);
  hit.innerHTML = html;
  fx.append(hit);
  window.setTimeout(() => hit.remove(), ttlMs);
}

function react(target: Element | null | undefined, cls: string): void {
  if (!target) return;
  target.classList.remove(cls);
  void (target as HTMLElement).getBoundingClientRect(); // restart the animation
  target.classList.add(cls);
}

const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

function hitVars(rng: Rng): Record<string, string> {
  return {
    '--dx': `${between(rng, -18, 18).toFixed(1)}px`,
    '--dy': `${between(rng, -22, 22).toFixed(1)}px`,
    '--r': `${between(rng, -75, 25).toFixed(1)}deg`,
  };
}

function particles(rng: Rng, n: number): string {
  let html = '';
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + rng();
    const dist = between(rng, 24, 40);
    html += `<i class="bi-fx__p" style="--sx:${(Math.cos(angle) * dist).toFixed(1)}px;--sy:${(Math.sin(angle) * dist).toFixed(1)}px"></i>`;
  }
  return html;
}

const effects: Record<EffectId, (stage: HTMLElement, opts: HitOptions) => void> = {
  'slash-sparks': (stage, { rng, target }) => {
    spawn(
      stage,
      'bi-fx--slash',
      `<i class="bi-fx__slash"></i>${particles(rng, 4)}`,
      hitVars(rng),
      650,
    );
    react(target, 'bi-react-flinch');
  },
  'slash-chips': (stage, { rng, target }) => {
    spawn(
      stage,
      'bi-fx--slash bi-fx--chips',
      `<i class="bi-fx__slash"></i>${particles(rng, 4)}`,
      hitVars(rng),
      900,
    );
    react(target, 'bi-react-flinch');
  },
  'heavy-hit': (stage, { rng, target }) => {
    spawn(
      stage,
      'bi-fx--rock',
      `<i class="bi-fx__dust"></i><i class="bi-fx__flash"></i><i class="bi-fx__burst"></i><i class="bi-fx__ring"></i>${particles(rng, 4)}`,
      hitVars(rng),
      900,
    );
    react(target, 'bi-react-thud');
  },
  // 'rise' is a tick style; see showTick.
  rise: () => undefined,
};

/** Plays one hit of an attack effect. Skipped entirely with reduced motion. */
export function playHit(effectId: string, stage: HTMLElement, opts: HitOptions): void {
  if (prefersReducedMotion()) return;
  const effect = effects[effectId as EffectId];
  if (!effect) throw new Error(`Unknown effect "${effectId}"`);
  effect(stage, opts);
}

/** Shows one floating damage or gain number. */
export function showTick(
  stage: HTMLElement,
  text: string,
  opts: { rng: Rng; crit?: boolean },
): void {
  const fx = layer(stage);
  const live = fx.querySelectorAll('.bi-tick');
  if (live.length >= MAX_LIVE_TICKS) live[0]?.remove();
  const tick = document.createElement('span');
  tick.className = `bi-tick${opts.crit ? ' bi-tick--crit' : ''}`;
  tick.style.setProperty('--x', `${between(opts.rng, 12, 64).toFixed(1)}%`);
  tick.textContent = text;
  tick.setAttribute('aria-hidden', 'true');
  fx.append(tick);
  window.setTimeout(() => tick.remove(), 1150);
}
