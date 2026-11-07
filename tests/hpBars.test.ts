import { describe, expect, it } from 'vitest';
import { Decimal, hpBarState } from '../src/game';

const d = (n: number | string) => new Decimal(n);

describe('hpBarState (stacked HP bars)', () => {
  it('shows all bars full at max HP', () => {
    expect(hpBarState(d(100), d(100), 5)).toEqual({ remaining: 5, fraction: 1, index: 4 });
  });

  it('drains the top bar first', () => {
    const s = hpBarState(d(90), d(100), 5); // each bar is 20
    expect(s.remaining).toBe(5);
    expect(s.fraction).toBeCloseTo(0.5);
  });

  it('moves to the next bar exactly at a boundary', () => {
    expect(hpBarState(d(80), d(100), 5)).toEqual({ remaining: 4, fraction: 1, index: 3 });
    const s = hpBarState(d(79), d(100), 5);
    expect(s.remaining).toBe(4);
    expect(s.fraction).toBeCloseTo(0.95);
  });

  it('keeps one bar while any HP is left, and none when dead', () => {
    expect(hpBarState(d(0.001), d(100), 5).remaining).toBe(1);
    expect(hpBarState(d(0), d(100), 5)).toEqual({ remaining: 0, fraction: 0, index: 0 });
  });

  it('works for huge numbers and clamps overheal', () => {
    const s = hpBarState(d('5e400'), d('1e401'), 10);
    expect(s.remaining).toBe(5);
    expect(s.fraction).toBeCloseTo(1);
    expect(hpBarState(d(200), d(100), 4).remaining).toBe(4);
  });

  it('treats a bar count below 1 as a single bar', () => {
    expect(hpBarState(d(50), d(100), 0)).toEqual({ remaining: 1, fraction: 0.5, index: 0 });
  });
});
