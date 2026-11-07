import { describe, expect, it } from 'vitest';
import { MIN_OFFLINE_MS, OFFLINE_CAP_MS, simulateOffline } from '../src/game';
import { constantRng, content, freshState } from './helpers';

const HOUR = 3_600_000;
const rng = constantRng(0.5);

describe('simulateOffline', () => {
  it('simulates the elapsed time and reports gains', () => {
    const { state, summary } = simulateOffline(freshState(), content, 0, HOUR, rng);
    expect(summary).not.toBeNull();
    expect(summary!.capped).toBe(false);
    expect(summary!.simulatedMs).toBe(HOUR);
    expect(state.resources['example_wood']!.eq(3600)).toBe(true);
    expect(summary!.gains['example_wood']!.eq(3600)).toBe(true);
    expect(summary!.bossKills).toBe(36); // 3600 damage / 100 HP
    expect(summary!.gains['example_portal_shard']!.eq(72)).toBe(true); // 36 kills * 2
  });

  it('caps offline progress at 8 hours', () => {
    const { state, summary } = simulateOffline(freshState(), content, 0, 20 * HOUR, rng);
    expect(OFFLINE_CAP_MS).toBe(8 * HOUR);
    expect(summary!.capped).toBe(true);
    expect(summary!.elapsedMs).toBe(20 * HOUR);
    expect(summary!.simulatedMs).toBe(8 * HOUR);
    expect(state.resources['example_wood']!.eq(8 * 3600)).toBe(true);
  });

  it('is not capped at exactly 8 hours', () => {
    const { summary } = simulateOffline(freshState(), content, 0, 8 * HOUR, rng);
    expect(summary!.capped).toBe(false);
  });

  it('does nothing for very short gaps', () => {
    const start = freshState();
    const result = simulateOffline(start, content, 1000, 1000 + MIN_OFFLINE_MS - 1, rng);
    expect(result.summary).toBeNull();
    expect(result.state).toBe(start);
  });

  it('does nothing when the clock went backwards', () => {
    const start = freshState();
    const result = simulateOffline(start, content, 10 * HOUR, HOUR, rng);
    expect(result.summary).toBeNull();
    expect(result.state).toBe(start);
  });
});
