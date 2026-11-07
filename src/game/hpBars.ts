import { Decimal } from './num';

export interface HpBarState {
  /** Bars left, including the one being drained ("x N" in the UI). 0 when dead. */
  remaining: number;
  /** How full the current bar is, 0..1. */
  fraction: number;
  /** Index of the current bar counted from the last one (0 = last bar), for colour cycling. */
  index: number;
}

/**
 * Splits boss HP into `bars` equal stacked bars, like a fighting-game life gauge.
 * Works on Decimals so it stays correct for huge HP values.
 */
export function hpBarState(hp: Decimal, maxHp: Decimal, bars: number): HpBarState {
  const count = Math.max(1, Math.floor(bars));
  if (hp.lte(0) || maxHp.lte(0)) return { remaining: 0, fraction: 0, index: 0 };
  const clamped = Decimal.min(hp, maxHp);
  const per = maxHp.div(count);
  // The ratio is at most `count` (<= 100), so a plain number is exact enough. The small tolerance
  // absorbs break_eternity rounding at huge magnitudes (5e400 / 1e400 can come out as 5.0000000003).
  const ratio = clamped.div(per).toNumber();
  const remaining = Math.min(count, Math.max(1, Math.ceil(ratio - 1e-9)));
  const fraction = Math.min(1, Math.max(0, ratio - (remaining - 1)));
  return { remaining, fraction, index: remaining - 1 };
}
