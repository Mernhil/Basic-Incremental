import { describe, expect, it } from 'vitest';
import { ContentValidationError, loadContent, validateContent, type RawContent } from '../src/data';
import resources from '../src/data/content/resources.json';
import trees from '../src/data/content/trees.json';
import mines from '../src/data/content/mines.json';
import production from '../src/data/content/production.json';
import cards from '../src/data/content/cards.json';
import dungeons from '../src/data/content/dungeons.json';
import cosmetics from '../src/data/content/cosmetics.json';
import portals from '../src/data/content/portals.json';
import rarities from '../src/data/content/rarities.json';
import wearRules from '../src/data/content/wearRules.json';
import sets from '../src/data/content/sets.json';

type PortalRaw = {
  cost: { resource: string };
  pool: { itemId: string }[];
  pity: { threshold: number };
} & Record<string, unknown>;

function raw(overrides: Partial<RawContent> = {}): RawContent {
  return structuredClone({
    resources,
    trees,
    mines,
    production,
    cards,
    dungeons,
    cosmetics,
    portals,
    rarities,
    wearRules,
    sets,
    ...overrides,
  });
}

function issuesFor(input: RawContent): string[] {
  try {
    validateContent(input);
  } catch (error) {
    if (error instanceof ContentValidationError) return error.issues;
    throw error;
  }
  return [];
}

describe('bundled content', () => {
  it('validates and exposes the beta content (DESIGN.md 11.6)', () => {
    const content = loadContent();
    expect(content.resources.length).toBeGreaterThanOrEqual(3);
    expect(content.trees.map((t) => t.name)).toEqual(['Oak', 'Ironbark', 'Moonwillow']);
    expect(content.mines.map((m) => [m.name, m.unlockedByDungeon])).toEqual([
      ['Copper Quarry', null],
      ['Iron Deeps', 'mossy_cellar'],
      ['Crystal Grotto', 'ember_crypt'],
    ]);
    expect(content.cards.map((c) => c.role).sort()).toEqual(['main', 'support']);
    expect(content.dungeons.map((d) => [d.name, d.boss.name])).toEqual([
      ['Mossy Cellar', 'Root Warden'],
      ['Ember Crypt', 'Cinder Lich'],
      ['Frostspire Vault', 'Glacier Colossus'],
    ]);
    expect(content.cosmetics.length).toBeGreaterThan(7);
    expect(content.portals).toHaveLength(1);
    expect(content.dungeons[0]!.boss.hp.eq(100)).toBe(true);
  });
});

describe('content validation errors', () => {
  it('names the file, index and field for schema problems', () => {
    const bad = raw();
    (bad.trees as Record<string, unknown>[])[0]!['baseRate'] = 'lots';
    const issues = issuesFor(bad);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^trees\.json › \[0\] › baseRate: /);
  });

  it('rejects unknown fields (typos) instead of ignoring them', () => {
    const bad = raw();
    (bad.dungeons as Record<string, unknown>[])[0]!['bosss'] = {};
    expect(issuesFor(bad).join('\n')).toContain('dungeons.json');
  });

  it('reports every file with problems at once', () => {
    const bad = raw({ resources: [{ id: 'Bad Id' }], cards: [{}] });
    const issues = issuesFor(bad);
    expect(issues.some((i) => i.startsWith('resources.json'))).toBe(true);
    expect(issues.some((i) => i.startsWith('cards.json'))).toBe(true);
  });

  it('catches broken cross-references', () => {
    const bad = raw();
    (bad.trees as Record<string, unknown>[])[0]!['resource'] = 'missing_wood';
    const list = bad.cosmetics as Record<string, unknown>[];
    const crown = list.findIndex((c) => c['exclusiveCard']);
    list[crown]!['exclusiveCard'] = 'missing_card';
    const issues = issuesFor(bad);
    expect(issues).toContain('trees.json › [0] › resource: unknown resource "missing_wood"');
    expect(issues).toContain(
      `cosmetics.json › [${crown}] › exclusiveCard: unknown card "missing_card"`,
    );
  });

  it('catches wrong resource kinds and duplicate ids', () => {
    const base = raw();
    (base.mines as Record<string, unknown>[])[0]!['resource'] = 'oak_wood';
    const list = base.resources as object[];
    const bad = { ...base, resources: [...list, list[0]!] };
    const issues = issuesFor(bad);
    expect(issues.some((i) => i.includes('is wood, expected ore'))).toBe(true);
    expect(issues.some((i) => i.includes('duplicate id "oak_wood"'))).toBe(true);
  });

  it('requires a message that explains the whole failure', () => {
    const bad = raw({ resources: 'nope' });
    expect(() => validateContent(bad)).toThrow(/Invalid game data \(\d+ problems?\)/);
  });
});

describe('card ranks and portals', () => {
  it('defaults a card to Bronze ★1 and keeps an explicit start rank', () => {
    const content = loadContent();
    const [main, support] = content.cards;
    expect(main!.startRank).toEqual({ tier: 'bronze', stars: 1 });
    expect(support!.startRank).toEqual({ tier: 'silver', stars: 2 });
  });

  it('rejects ranks outside Bronze..Prismatic and ★1..6', () => {
    for (const startRank of [
      { tier: 'diamond', stars: 1 },
      { tier: 'gold', stars: 0 },
      { tier: 'gold', stars: 7 },
      { tier: 'gold', stars: 2.5 },
    ]) {
      const bad = raw();
      (bad.cards as Record<string, unknown>[])[0]!['startRank'] = startRank;
      expect(issuesFor(bad).some((i) => i.startsWith('cards.json › [0] › startRank'))).toBe(true);
    }
  });

  it('catches portal cost and pool problems', () => {
    const bad = raw();
    const portal = (bad.portals as PortalRaw[])[0]!;
    portal.cost.resource = 'oak_wood';
    portal.pool[0]!.itemId = 'holo_hex'; // a cosmetic in a cards portal
    portal.pool[1]!.itemId = 'missing_card';
    const issues = issuesFor(bad);
    expect(issues.some((i) => i.includes('is wood, expected portal'))).toBe(true);
    expect(
      issues.some((i) => i.includes('pool › [0] › itemId') && i.includes('not a known card')),
    ).toBe(true);
    expect(issues.some((i) => i.includes('pool › [1] › itemId'))).toBe(true);
  });

  it('requires a non-empty pool and a valid pity threshold', () => {
    const bad = raw();
    const portal = (bad.portals as PortalRaw[])[0]!;
    portal['pool'] = [];
    portal['pity'].threshold = 0;
    const issues = issuesFor(bad);
    expect(issues.some((i) => i.startsWith('portals.json › [0] › pool'))).toBe(true);
    expect(issues.some((i) => i.startsWith('portals.json › [0] › pity › threshold'))).toBe(true);
  });
});

describe('production data', () => {
  type ProductionRaw = Record<
    'logging' | 'mining',
    { startProducer: string; expansion: { resource: string; growth: string } }
  >;

  it('catches wrong cost resources, bad start producers and shared ids', () => {
    const bad = raw();
    const trees = bad.trees as { unlockCost: { resource: string }[] }[];
    trees[1]!.unlockCost[0]!.resource = 'copper_ore';
    const mines = bad.mines as { id: string; level: { cost: { resource: string } } }[];
    mines[0]!.level.cost.resource = 'oak_wood';
    mines[2]!.id = 'oak';
    const production = bad.production as ProductionRaw;
    production.logging.startProducer = 'ironbark';
    production.mining.startProducer = 'missing_mine';
    production.mining.expansion.resource = 'moss_sigil';
    const issues = issuesFor(bad);
    expect(issues).toContain(
      'trees.json › [1] › unlockCost › [0] › resource: "copper_ore" is ore, expected wood',
    );
    expect(issues).toContain(
      'mines.json › [0] › level › cost › resource: "oak_wood" is wood, expected ore',
    );
    expect(issues).toContain('mines.json › [2] › id: "oak" is already a tree id');
    expect(issues).toContain(
      'production.json › logging › startProducer: "ironbark" is not available from the start',
    );
    expect(issues).toContain(
      'production.json › mining › startProducer: unknown mine "missing_mine"',
    );
    expect(issues).toContain(
      'production.json › mining › expansion › resource: "moss_sigil" is portal, expected ore',
    );
  });

  it('rejects a cost curve that shrinks', () => {
    const bad = raw();
    (bad.production as ProductionRaw).logging.expansion.growth = '0.9';
    expect(issuesFor(bad)).toContain(
      'production.json › logging › expansion › growth: must be at least 1',
    );
  });
});
