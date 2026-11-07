/** Pure game-level constants. No UI or Electron imports allowed in src/game. */
export const GAME_TITLE = 'Basic incremental';

export function formatVersionLabel(version: string): string {
  return `v${version}`;
}
