import { loadContent, type Content } from '../src/data';
import { createInitialState, type GameState } from '../src/game';

export const content: Content = loadContent();

export function freshState(): GameState {
  return createInitialState(content);
}

/** Always returns the same value; handy for forcing drop/no-drop. */
export const constantRng = (value: number) => () => value;
