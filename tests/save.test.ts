import { describe, expect, it } from 'vitest';
import {
  advance,
  CURRENT_SAVE_VERSION,
  createSaveText,
  Decimal,
  exportSaveString,
  importSaveString,
  loadBestSave,
  readSave,
  SaveError,
  serializeState,
} from '../src/game';
import { constantRng, content, freshState } from './helpers';

/** A state with non-trivial values everywhere. */
function busyState() {
  let state = advance(freshState(), content, 250_000, constantRng(0.001)).state; // 2 kills, 2 rares
  state = { ...state, damage: new Decimal('1.5e500'), prestigeCount: 3 };
  state.pity = { example_boss: 17 };
  return state;
}

const NOW = 1_700_000_000_000;

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof SaveError) return error.code;
    throw error;
  }
  return undefined;
}

describe('save round-trip', () => {
  it('restores the exact state, including huge numbers', () => {
    const state = busyState();
    const loaded = readSave(createSaveText(state, NOW), content);
    expect(loaded.savedAt).toBe(NOW);
    expect(serializeState(loaded.state)).toEqual(serializeState(state));
    expect(loaded.state.damage.eq(new Decimal('1.5e500'))).toBe(true);
    expect(loaded.state.inventory['holo_hex']).toBe(2);
    expect(loaded.state.pity['example_boss']).toBe(17);
    expect(loaded.state.bossHp!.eq(state.bossHp!)).toBe(true);
  });

  it('stamps the current save version', () => {
    expect(JSON.parse(createSaveText(freshState(), NOW)).version).toBe(CURRENT_SAVE_VERSION);
  });

  it('fills in resources that were added to the content after the save', () => {
    const json = JSON.parse(createSaveText(freshState(), NOW));
    delete json.state.resources['example_ore'];
    const loaded = readSave(JSON.stringify(json), content);
    expect(loaded.state.resources['example_ore']!.eq(0)).toBe(true);
  });

  it('falls back to a valid dungeon if the saved one no longer exists', () => {
    const json = JSON.parse(createSaveText(freshState(), NOW));
    json.state.activeDungeonId = 'deleted_dungeon';
    const loaded = readSave(JSON.stringify(json), content);
    expect(loaded.state.activeDungeonId).toBe('example_dungeon');
  });
});

describe('invalid saves', () => {
  it('rejects non-JSON, wrong shapes, and bad values with specific codes', () => {
    expect(codeOf(() => readSave('{nope', content))).toBe('invalid-json');
    expect(codeOf(() => readSave('{"hello":1}', content))).toBe('invalid-format');
    const bad = JSON.parse(createSaveText(freshState(), NOW));
    bad.state.damage = 'banana';
    expect(codeOf(() => readSave(JSON.stringify(bad), content))).toBe('invalid-format');
    bad.version = 0;
    expect(codeOf(() => readSave(JSON.stringify(bad), content))).toBe('invalid-format');
  });

  it('refuses saves from a newer game version', () => {
    const future = JSON.parse(createSaveText(freshState(), NOW));
    future.version = CURRENT_SAVE_VERSION + 1;
    expect(codeOf(() => readSave(JSON.stringify(future), content))).toBe('future-version');
  });

  it('flags an old save when no migration path exists', () => {
    // Pretend the app is at version 1 but a v0-style save has no migration: version 0 is invalid.
    expect(codeOf(() => readSave('{"version":0,"savedAt":1,"state":{}}', content))).toBe(
      'invalid-format',
    );
  });
});

describe('loadBestSave', () => {
  const good = createSaveText(busyState(), NOW);

  it('prefers the main save', () => {
    const result = loadBestSave(good, createSaveText(freshState(), 1), content);
    expect(result.source).toBe('primary');
    expect(result.save!.savedAt).toBe(NOW);
    expect(result.errors).toEqual([]);
  });

  it('falls back to the backup when the main save is corrupted', () => {
    const result = loadBestSave('{"version":1,"savedAt":', good, content);
    expect(result.source).toBe('backup');
    expect(result.save!.savedAt).toBe(NOW);
    expect(result.errors).toHaveLength(1);
  });

  it('reports nothing-to-load for a fresh install, and errors when both are bad', () => {
    expect(loadBestSave(null, null, content)).toEqual({ save: null, source: 'none', errors: [] });
    const both = loadBestSave('x', 'y', content);
    expect(both.source).toBe('none');
    expect(both.errors).toHaveLength(2);
  });
});

describe('export / import', () => {
  it('round-trips through a single-line string', () => {
    const state = busyState();
    const text = exportSaveString(state, NOW);
    expect(text).not.toMatch(/\s/);
    const loaded = importSaveString(text, content);
    expect(serializeState(loaded.state)).toEqual(serializeState(state));
    expect(loaded.savedAt).toBe(NOW);
  });

  it('tolerates whitespace added when copy-pasting', () => {
    const text = exportSaveString(freshState(), NOW);
    const wrapped = `  ${text.slice(0, 20)}\n${text.slice(20)}  \n`;
    expect(importSaveString(wrapped, content).savedAt).toBe(NOW);
  });

  it('rejects garbage, truncated and tampered strings', () => {
    const text = exportSaveString(freshState(), NOW);
    expect(codeOf(() => importSaveString('hello', content))).toBe('invalid-export');
    expect(codeOf(() => importSaveString('BIv1:!!!notbase64', content))).toBe('invalid-export');
    expect(codeOf(() => importSaveString(text.slice(0, text.length - 12), content))).toBeDefined();
  });
});

describe('save format v2: cosmetics', () => {
  it('round-trips the equipped loadout and owned items', () => {
    const state = freshState();
    state.cosmetics.owned['gilded_filigree'] = { level: 3, copies: 4 };
    state.cosmetics.loadout = {
      slots: { border: { id: 'gilded_filigree', level: 3 } },
      cards: { example_fighting_main: { border: { id: 'ember_crown', level: 1 } } },
    };
    const loaded = readSave(createSaveText(state, NOW), content);
    expect(loaded.state.cosmetics).toEqual(state.cosmetics);
  });

  it('starts a new game owning every starter item', () => {
    const owned = freshState().cosmetics.owned;
    for (const starter of Object.values(content.starterBySlot)) {
      expect(owned[starter.id]).toEqual({ level: 1, copies: 1 });
    }
  });

  it('migrates a v1 save (no cosmetics) to v2 with starters owned', () => {
    const v1 = JSON.parse(createSaveText(freshState(), NOW));
    v1.version = 1;
    delete v1.state.cosmetics;
    const loaded = readSave(JSON.stringify(v1), content);
    expect(loaded.state.cosmetics.loadout).toEqual({ slots: {}, cards: {} });
    expect(loaded.state.cosmetics.owned['gn_border']).toEqual({ level: 1, copies: 1 });
  });

  it('drops cosmetics that no longer exist and clamps levels', () => {
    const json = JSON.parse(createSaveText(freshState(), NOW));
    json.state.cosmetics.owned['removed_item'] = { level: 1, copies: 1 };
    json.state.cosmetics.owned['aurora_veil'] = { level: 9, copies: 0 };
    json.state.cosmetics.loadout.slots.border = { id: 'removed_item', level: 1 };
    const loaded = readSave(JSON.stringify(json), content);
    expect(loaded.state.cosmetics.owned['removed_item']).toBeUndefined();
    expect(loaded.state.cosmetics.owned['aurora_veil']!.level).toBe(3);
    expect(loaded.state.cosmetics.loadout.slots.border).toBeUndefined();
  });
});
