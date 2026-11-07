import type { Content } from '../data';
import type { Rng } from './rng';
import type { GameState } from './state';
import type { TickReport } from './report';
import { advanceChunked } from './tick';

/** Real elapsed time larger than this in one step is clamped (matches the offline cap). */
export const MAX_STEP_MS = 8 * 60 * 60 * 1000;
const CHUNK_MS = 1000;

/**
 * Drives the game from real elapsed time. The host (renderer) calls `step(Date.now())` on a
 * timer or animation frame; how often it does so does not change the outcome, because each
 * step advances by the actual time since the previous one.
 */
export class GameLoop {
  private lastMs: number;

  constructor(
    public state: GameState,
    private readonly content: Content,
    private readonly rng: Rng,
    startMs: number,
  ) {
    this.lastMs = startMs;
  }

  step(nowMs: number): TickReport {
    // A clock that went backwards (or a huge gap, e.g. after sleep) is clamped, never negative.
    const delta = Math.min(Math.max(0, nowMs - this.lastMs), MAX_STEP_MS);
    this.lastMs = Math.max(this.lastMs, nowMs);
    const { state, report } = advanceChunked(this.state, this.content, delta, this.rng, CHUNK_MS);
    this.state = state;
    return report;
  }

  /** Replace the state (e.g. after import) and restart the clock. */
  reset(state: GameState, nowMs: number): void {
    this.state = state;
    this.lastMs = nowMs;
  }
}
