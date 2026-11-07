import { describe, expect, it } from 'vitest';
import {
  advance,
  advanceChunked,
  approxEq,
  bossMaxHp,
  Decimal,
  MAX_KILLS_PER_ADVANCE,
} from '../src/game';
import { constantRng, content, freshState } from './helpers';

const dungeon = content.dungeons[0]!;
const rng = constantRng(0.5);

describe('advance (tick math)', () => {
  it('produces rate * plots * seconds', () => {
    const { state } = advance(freshState(), content, 10_000, rng);
    expect(state.resources['example_wood']!.eq(10)).toBe(true);
    expect(state.resources['example_ore']!.eq(0)).toBe(true);

    const triple = freshState();
    triple.producers['example_tree'] = 3;
    const result = advance(triple, content, 10_000, rng);
    expect(result.state.resources['example_wood']!.eq(30)).toBe(true);
  });

  it('applies damage to the boss without killing it', () => {
    const { state, report } = advance(freshState(), content, 10_000, rng);
    expect(state.bossHp!.eq(90)).toBe(true);
    expect(report.bossKills).toBe(0);
  });

  it('kills, rolls the portal drop and respawns the boss at full HP', () => {
    const { state, report } = advance(freshState(), content, 100_000, rng);
    expect(report.bossKills).toBe(1);
    expect(state.stats.bossKills).toBe(1);
    // rng 0.5 -> 1 + floor(0.5 * 3) = 2 portal shards
    expect(state.resources['example_portal_shard']!.eq(2)).toBe(true);
    expect(state.bossHp!.eq(100)).toBe(true);
  });

  it('carries overflow damage into the next boss', () => {
    const { state, report } = advance(freshState(), content, 250_000, rng);
    expect(report.bossKills).toBe(2);
    expect(state.bossHp!.eq(50)).toBe(true);
  });

  it('ignores zero, negative and non-finite deltas', () => {
    const start = freshState();
    for (const dt of [0, -5, NaN, Infinity]) {
      expect(advance(start, content, dt, rng).state).toBe(start);
    }
  });

  it('does not mutate the previous state', () => {
    const start = freshState();
    advance(start, content, 100_000, rng);
    expect(start.resources['example_wood']!.eq(0)).toBe(true);
    expect(start.bossHp).toBeNull();
    expect(start.stats.bossKills).toBe(0);
  });

  it('scales boss HP slowly with prestige count', () => {
    expect(bossMaxHp(dungeon, 0).eq(100)).toBe(true);
    // 100 * 1.02^10
    expect(approxEq(bossMaxHp(dungeon, 10), 121.899441999, 1e-6)).toBe(true);
  });

  it('caps boss kills per call', () => {
    const strong = freshState();
    strong.damage = new Decimal('1e30');
    const { report } = advance(strong, content, 1000, rng);
    expect(report.bossKills).toBe(MAX_KILLS_PER_ADVANCE);
  });

  it('gives the same result however the time is split (frame-rate independence)', () => {
    const total = 12_345;
    const whole = advance(freshState(), content, total, rng).state;
    const coarse = advanceChunked(freshState(), content, total, rng, 1000).state;
    const fine = advanceChunked(freshState(), content, total, rng, 16).state;
    for (const other of [coarse, fine]) {
      expect(approxEq(other.resources['example_wood']!, whole.resources['example_wood']!)).toBe(
        true,
      );
      expect(approxEq(other.bossHp!, whole.bossHp!)).toBe(true);
      expect(other.stats.playTimeMs).toBe(total);
    }
  });
});
