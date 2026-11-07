import { describe, expect, it } from 'vitest';
import { ContentValidationError, loadContent, validateContent, type RawContent } from '../src/data';
import resources from '../src/data/content/resources.json';
import trees from '../src/data/content/trees.json';
import mines from '../src/data/content/mines.json';
import cards from '../src/data/content/cards.json';
import dungeons from '../src/data/content/dungeons.json';
import cosmetics from '../src/data/content/cosmetics.json';

function raw(overrides: Partial<RawContent> = {}): RawContent {
  return structuredClone({ resources, trees, mines, cards, dungeons, cosmetics, ...overrides });
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
  it('validates and exposes one of each entry', () => {
    const content = loadContent();
    expect(content.resources.length).toBeGreaterThanOrEqual(3);
    expect(content.trees).toHaveLength(1);
    expect(content.mines).toHaveLength(1);
    expect(content.cards.map((c) => c.role).sort()).toEqual(['main', 'support']);
    expect(content.dungeons).toHaveLength(1);
    expect(content.cosmetics).toHaveLength(1);
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
    (bad.cosmetics as Record<string, unknown>[])[0]!['exclusiveCard'] = 'missing_card';
    const issues = issuesFor(bad);
    expect(issues).toContain('trees.json › [0] › resource: unknown resource "missing_wood"');
    expect(issues).toContain('cosmetics.json › [0] › exclusiveCard: unknown card "missing_card"');
  });

  it('catches wrong resource kinds and duplicate ids', () => {
    const bad = raw();
    (bad.mines as Record<string, unknown>[])[0]!['resource'] = 'example_wood';
    bad.resources = [...(bad.resources as object[]), (bad.resources as object[])[0]!];
    const issues = issuesFor(bad);
    expect(issues.some((i) => i.includes('is wood, expected ore'))).toBe(true);
    expect(issues.some((i) => i.includes('duplicate id "example_wood"'))).toBe(true);
  });

  it('requires a message that explains the whole failure', () => {
    const bad = raw({ resources: 'nope' });
    expect(() => validateContent(bad)).toThrow(/Invalid game data \(\d+ problems?\)/);
  });
});
