import { describe, expect, it } from 'vitest';
import { GAME_TITLE, formatVersionLabel } from '../src/game';

describe('game meta', () => {
  it('has the expected title', () => {
    expect(GAME_TITLE).toBe('Basic incremental');
  });

  it('formats the version label', () => {
    expect(formatVersionLabel('0.1.0')).toBe('v0.1.0');
  });
});
