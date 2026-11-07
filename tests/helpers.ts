import { JOBS, loadContent, type Content } from '../src/data';
import { createInitialState, emptyCardLoadout, type GameState } from '../src/game';

export const content: Content = loadContent();

export function freshState(): GameState {
  return createInitialState(content);
}

/** A new game with empty card loadouts: no card effects or level-ups, for exact rate maths. */
export function bareState(): GameState {
  const state = freshState();
  for (const job of JOBS) state.cards.loadouts[job] = emptyCardLoadout();
  return state;
}

/** Always returns the same value; handy for forcing drop/no-drop. */
export const constantRng = (value: number) => () => value;
