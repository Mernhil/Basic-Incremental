import { describe, expect, it } from 'vitest';
import { Decimal, formatDecimal, formatDuration } from '../src/game';

describe('formatDuration', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(450_000)).toBe('7m 30s');
    expect(formatDuration(7_500_000)).toBe('2h 5m');
    expect(formatDuration(8 * 3_600_000)).toBe('8h');
    expect(formatDuration(-5)).toBe('0s');
  });
});

describe('formatDecimal', () => {
  it('shows small numbers plainly and huge ones in scientific form', () => {
    expect(formatDecimal(new Decimal(0))).toBe('0');
    expect(formatDecimal(new Decimal(12.5))).toBe('12.5');
    expect(formatDecimal(new Decimal(100))).toBe('100');
    expect(formatDecimal(new Decimal(123456))).toBe('123,456');
    expect(formatDecimal(new Decimal('1.5e500'))).toBe('1.5e500');
  });
});
