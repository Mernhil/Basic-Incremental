import { contentSchemas } from './schemas';
import type { Card, Cosmetic, Dungeon, Mine, Portal, Resource, Tree } from './schemas';
import resourcesJson from './content/resources.json';
import treesJson from './content/trees.json';
import minesJson from './content/mines.json';
import cardsJson from './content/cards.json';
import dungeonsJson from './content/dungeons.json';
import cosmeticsJson from './content/cosmetics.json';
import portalsJson from './content/portals.json';

export * from './schemas';

export interface Content {
  resources: Resource[];
  trees: Tree[];
  mines: Mine[];
  cards: Card[];
  dungeons: Dungeon[];
  cosmetics: Cosmetic[];
  portals: Portal[];
  resourceById: ReadonlyMap<string, Resource>;
  dungeonById: ReadonlyMap<string, Dungeon>;
}

export type RawContent = { [K in keyof typeof contentSchemas]: unknown };

/** Thrown when content data is malformed. `issues` is one human-readable line per problem. */
export class ContentValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      `Invalid game data (${issues.length} problem${issues.length === 1 ? '' : 's'}):\n` +
        issues.map((i) => `  - ${i}`).join('\n'),
    );
    this.name = 'ContentValidationError';
  }
}

/** Validates raw content (schemas + cross-references) and returns typed content. */
export function validateContent(raw: RawContent): Content {
  const issues: string[] = [];
  const parsed = {} as {
    [K in keyof typeof contentSchemas]: ReturnType<(typeof contentSchemas)[K]['parse']>;
  };

  for (const key of Object.keys(contentSchemas) as (keyof typeof contentSchemas)[]) {
    const result = contentSchemas[key].safeParse(raw[key]);
    if (result.success) {
      (parsed as Record<string, unknown>)[key] = result.data;
    } else {
      for (const issue of result.error.issues) {
        const path = issue.path.map((p) => (typeof p === 'number' ? `[${p}]` : String(p)));
        issues.push([`${key}.json`, ...path].join(' › ') + `: ${issue.message}`);
      }
    }
  }
  if (issues.length > 0) throw new ContentValidationError(issues);

  const { resources, trees, mines, cards, dungeons, cosmetics, portals } = parsed;
  checkReferences({ resources, trees, mines, cards, dungeons, cosmetics, portals }, issues);
  if (issues.length > 0) throw new ContentValidationError(issues);

  return {
    resources,
    trees,
    mines,
    cards,
    dungeons,
    cosmetics,
    portals,
    resourceById: new Map(resources.map((r) => [r.id, r])),
    dungeonById: new Map(dungeons.map((d) => [d.id, d])),
  };
}

function checkReferences(
  c: Pick<
    Content,
    'resources' | 'trees' | 'mines' | 'cards' | 'dungeons' | 'cosmetics' | 'portals'
  >,
  issues: string[],
): void {
  const duplicates = (file: string, items: { id: string }[]): void => {
    const seen = new Set<string>();
    items.forEach((item, i) => {
      if (seen.has(item.id)) issues.push(`${file}.json › [${i}] › id: duplicate id "${item.id}"`);
      seen.add(item.id);
    });
  };
  duplicates('resources', c.resources);
  duplicates('trees', c.trees);
  duplicates('mines', c.mines);
  duplicates('cards', c.cards);
  duplicates('dungeons', c.dungeons);
  duplicates('cosmetics', c.cosmetics);
  duplicates('portals', c.portals);

  const resources = new Map(c.resources.map((r) => [r.id, r]));
  const cardIds = new Set(c.cards.map((x) => x.id));
  const cosmeticIds = new Set(c.cosmetics.map((x) => x.id));
  const dungeonIds = new Set(c.dungeons.map((x) => x.id));

  const checkProducer = (
    file: 'trees' | 'mines',
    kind: Resource['kind'],
    items: (Tree | Mine)[],
  ): void => {
    items.forEach((item, i) => {
      const out = resources.get(item.resource);
      if (!out) {
        issues.push(`${file}.json › [${i}] › resource: unknown resource "${item.resource}"`);
      } else if (out.kind !== kind) {
        issues.push(
          `${file}.json › [${i}] › resource: "${item.resource}" is ${out.kind}, expected ${kind}`,
        );
      }
      item.cost.forEach((cost, j) => {
        if (!resources.has(cost.resource)) {
          issues.push(
            `${file}.json › [${i}] › cost › [${j}] › resource: unknown resource "${cost.resource}"`,
          );
        }
      });
    });
  };
  checkProducer('trees', 'wood', c.trees);
  checkProducer('mines', 'ore', c.mines);

  c.mines.forEach((mine, i) => {
    if (mine.unlockedByDungeon && !dungeonIds.has(mine.unlockedByDungeon)) {
      issues.push(
        `mines.json › [${i}] › unlockedByDungeon: unknown dungeon "${mine.unlockedByDungeon}"`,
      );
    }
  });

  c.dungeons.forEach((dungeon, i) => {
    const portal = dungeon.drops.portalResource.resource;
    const res = resources.get(portal);
    if (!res) {
      issues.push(
        `dungeons.json › [${i}] › drops › portalResource › resource: unknown resource "${portal}"`,
      );
    } else if (res.kind !== 'portal') {
      issues.push(
        `dungeons.json › [${i}] › drops › portalResource › resource: "${portal}" is ${res.kind}, expected portal`,
      );
    }
    const item = dungeon.drops.rare.itemId;
    if (!cardIds.has(item) && !cosmeticIds.has(item)) {
      issues.push(
        `dungeons.json › [${i}] › drops › rare › itemId: "${item}" is not a known card or cosmetic`,
      );
    }
  });

  c.portals.forEach((portal, i) => {
    const res = resources.get(portal.cost.resource);
    if (!res) {
      issues.push(
        `portals.json › [${i}] › cost › resource: unknown resource "${portal.cost.resource}"`,
      );
    } else if (res.kind !== 'portal') {
      issues.push(
        `portals.json › [${i}] › cost › resource: "${portal.cost.resource}" is ${res.kind}, expected portal`,
      );
    }
    const valid = portal.kind === 'cards' ? cardIds : cosmeticIds;
    portal.pool.forEach((entry, j) => {
      if (!valid.has(entry.itemId)) {
        issues.push(
          `portals.json › [${i}] › pool › [${j}] › itemId: "${entry.itemId}" is not a known ${portal.kind === 'cards' ? 'card' : 'cosmetic'}`,
        );
      }
    });
  });

  c.cosmetics.forEach((cosmetic, i) => {
    if (cosmetic.exclusiveCard && !cardIds.has(cosmetic.exclusiveCard)) {
      issues.push(
        `cosmetics.json › [${i}] › exclusiveCard: unknown card "${cosmetic.exclusiveCard}"`,
      );
    }
  });
}

/** Loads and validates the bundled game data. Call once at startup. */
export function loadContent(): Content {
  return validateContent({
    resources: resourcesJson,
    trees: treesJson,
    mines: minesJson,
    cards: cardsJson,
    dungeons: dungeonsJson,
    cosmetics: cosmeticsJson,
    portals: portalsJson,
  });
}
