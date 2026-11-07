import type { Content } from '../../../data';
import {
  globalVars,
  missingVisuals,
  resolveGlobal,
  type CosmeticLoadout,
  type ResolvedCard,
} from '../../../game';
import { KNOWN_VISUALS } from './registry';
import './base.css';
import './rank.css';
import './recipes.css';

const RECIPE_PREFIX = 'r-';

/** Throws if cosmetic data names a recipe or effect the renderer does not implement. */
export function assertVisualsImplemented(content: Content): void {
  const problems = missingVisuals(content, KNOWN_VISUALS);
  if (problems.length > 0) {
    throw new Error(
      `Cosmetic data refers to visuals that do not exist:\n  - ${problems.join('\n  - ')}`,
    );
  }
}

/** Replaces the element's r-* classes and the given CSS variables. */
function setVisuals(
  el: HTMLElement,
  vars: Record<string, string>,
  recipes: string[],
  previousVars: string[],
): string[] {
  for (const name of previousVars) if (!(name in vars)) el.style.removeProperty(name);
  for (const [name, value] of Object.entries(vars)) el.style.setProperty(name, value);
  for (const cls of [...el.classList]) if (cls.startsWith(RECIPE_PREFIX)) el.classList.remove(cls);
  for (const recipe of recipes) el.classList.add(RECIPE_PREFIX + recipe);
  return Object.keys(vars);
}

const applied = new WeakMap<HTMLElement, string[]>();

/** Applies the global slots (table, numbers, ticks, attack, cursor) to <html>. Instant, no reload. */
export function applyGlobalTheme(
  content: Content,
  loadout: CosmeticLoadout,
  root = document.documentElement,
): void {
  const { vars, recipes } = globalVars(resolveGlobal(content, loadout));
  applied.set(root, setVisuals(root, vars, recipes, applied.get(root) ?? []));
}

/** Applies one card's resolved cosmetics (card slots, exclusives, rarity) to its element. */
export function applyCardTheme(el: HTMLElement, resolved: ResolvedCard): void {
  applied.set(el, setVisuals(el, resolved.vars, resolved.recipes, applied.get(el) ?? []));
}
