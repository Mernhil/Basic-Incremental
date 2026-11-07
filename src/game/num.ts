import Decimal from 'break_eternity.js';
import type { DecimalSource } from 'break_eternity.js';

/**
 * All game numbers use break_eternity.js. Import Decimal from here, never from the
 * package directly, so there is a single place to adjust if the library changes.
 */
export { Decimal };
export type { DecimalSource };

const DECIMAL_PATTERN = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** True for strings like "100", "1.5e300", "-2". Note `new Decimal('abc')` is 0, not an error. */
export function isDecimalString(value: string): boolean {
  if (!DECIMAL_PATTERN.test(value.trim())) return false;
  const d = new Decimal(value);
  return !d.isNan() && d.isFinite();
}

/** Lossless text form used in save files. */
export function decimalToString(value: Decimal): string {
  return value.toString();
}

export function decimalFromString(value: string): Decimal {
  if (!isDecimalString(value)) throw new Error(`Invalid number string: "${value}"`);
  return new Decimal(value);
}

/** Compare with a relative tolerance; break_eternity is not exact for huge values. */
export function approxEq(a: DecimalSource, b: DecimalSource, relTol = 1e-9): boolean {
  const x = new Decimal(a);
  const y = new Decimal(b);
  if (x.eq(y)) return true;
  const diff = x.sub(y).abs();
  const scale = Decimal.max(x.abs(), y.abs());
  return diff.lte(scale.mul(relTol));
}

/** Short display form: plain below 1e6, scientific above. */
export function formatDecimal(value: Decimal): string {
  if (value.lt(1000)) return trimZeros(value.toFixed(2));
  if (value.lt(1e6)) return Math.floor(value.toNumber()).toLocaleString('en-US');
  return value.toExponential(2).replace('e+', 'e');
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}
