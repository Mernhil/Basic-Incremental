import { describe, expect, it } from 'vitest';
import { approxEq, GameLoop, MAX_STEP_MS } from '../src/game';
import { constantRng, content, freshState } from './helpers';

function run(frameMs: number, totalMs: number): GameLoop {
  const loop = new GameLoop(freshState(), content, constantRng(0.5), 0);
  for (let t = frameMs; t <= totalMs; t += frameMs) loop.step(t);
  loop.step(totalMs);
  return loop;
}

describe('GameLoop', () => {
  it('is independent of frame rate', () => {
    const slow = run(250, 30_000);
    const fast = run(16, 30_000);
    const single = run(30_000, 30_000);
    for (const loop of [slow, fast]) {
      expect(approxEq(loop.state.resources['oak_wood']!, 30)).toBe(true);
      expect(approxEq(loop.state.bossHp!, single.state.bossHp!)).toBe(true);
      expect(loop.state.stats.playTimeMs).toBe(30_000);
    }
  });

  it('never runs backwards when the clock jumps back', () => {
    const loop = new GameLoop(freshState(), content, constantRng(0.5), 10_000);
    loop.step(20_000);
    const before = loop.state;
    loop.step(5_000);
    expect(loop.state.resources['oak_wood']!.eq(before.resources['oak_wood']!)).toBe(true);
    // Time resumes from the latest seen clock value, not the earlier one.
    loop.step(21_000);
    expect(loop.state.resources['oak_wood']!.eq(11)).toBe(true);
  });

  it('clamps a huge gap to the maximum step', () => {
    const loop = new GameLoop(freshState(), content, constantRng(0.5), 0);
    loop.step(MAX_STEP_MS * 5);
    expect(loop.state.stats.playTimeMs).toBe(MAX_STEP_MS);
  });
});
