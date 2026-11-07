import { describe, expect, it } from 'vitest';
import { createSeededRng, rollBossDrop } from '../src/game';
import { constantRng, content } from './helpers';

const drops = content.dungeons[0]!.drops; // chance 0.005, pity threshold 200, portal 1..3

describe('rollBossDrop', () => {
  it('does not drop when the roll misses and pity is not reached', () => {
    const result = rollBossDrop(drops, 0, constantRng(0.999));
    expect(result.rare).toBe(false);
    expect(result.pity).toBe(1);
  });

  it('drops when the roll is under the chance, and resets pity', () => {
    const result = rollBossDrop(drops, 57, constantRng(0.001));
    expect(result.rare).toBe(true);
    expect(result.pity).toBe(0);
  });

  it('guarantees the drop on the pity-threshold-th kill', () => {
    const rng = constantRng(0.999); // never wins on its own
    let pity = 0;
    let kills = 0;
    let dropped = false;
    while (!dropped) {
      const roll = rollBossDrop(drops, pity, rng);
      pity = roll.pity;
      dropped = roll.rare;
      kills++;
      expect(kills).toBeLessThanOrEqual(drops.rare.pityThreshold);
    }
    expect(kills).toBe(drops.rare.pityThreshold);
    expect(pity).toBe(0);
  });

  it('matches the configured rate when pity is out of the way', () => {
    const noPity = { ...drops, rare: { ...drops.rare, pityThreshold: 1_000_000_000 } };
    const rng = createSeededRng(12345);
    const rolls = 400_000;
    let hits = 0;
    let pity = 0;
    for (let i = 0; i < rolls; i++) {
      const roll = rollBossDrop(noPity, pity, rng);
      pity = roll.pity;
      if (roll.rare) hits++;
    }
    const expected = rolls * 0.005; // 2000, standard deviation about 44.6
    expect(Math.abs(hits - expected)).toBeLessThan(5 * 44.6);
  });

  it('with pity, averages (1 - (1-p)^T) / p kills per drop and never exceeds T', () => {
    const rng = createSeededRng(777);
    const { chance, pityThreshold } = drops.rare;
    const expectedKillsPerDrop = (1 - Math.pow(1 - chance, pityThreshold)) / chance; // about 126.6
    let pity = 0;
    let sinceDrop = 0;
    let longest = 0;
    let dropCount = 0;
    const rolls = 300_000;
    for (let i = 0; i < rolls; i++) {
      const roll = rollBossDrop(drops, pity, rng);
      pity = roll.pity;
      sinceDrop++;
      if (roll.rare) {
        dropCount++;
        longest = Math.max(longest, sinceDrop);
        sinceDrop = 0;
      }
    }
    expect(longest).toBeLessThanOrEqual(pityThreshold);
    const observed = rolls / dropCount;
    expect(Math.abs(observed - expectedKillsPerDrop) / expectedKillsPerDrop).toBeLessThan(0.05);
  });

  it('grants portal resource uniformly within [min, max]', () => {
    const rng = createSeededRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const { portal } = rollBossDrop(drops, 0, rng);
      expect(portal).toBeGreaterThanOrEqual(drops.portalResource.min);
      expect(portal).toBeLessThanOrEqual(drops.portalResource.max);
      seen.add(portal);
    }
    const { min, max } = drops.portalResource;
    expect([...seen].sort()).toEqual(Array.from({ length: max - min + 1 }, (_, i) => min + i));
  });
});
