import { SaveError } from './saveError';

/** Upgrades the state payload from version N to N + 1. Must not mutate its input. */
export type MigrationStep = (state: Record<string, unknown>) => Record<string, unknown>;

/** Keyed by the version a step upgrades FROM: `{ 1: v1ToV2 }` turns a v1 payload into v2. */
export type MigrationTable = Record<number, MigrationStep>;

/**
 * The real migrations. Whenever the save format changes: bump CURRENT_SAVE_VERSION and add a
 * step here keyed by the previous version.
 */
export const MIGRATIONS: MigrationTable = {
  /** v1 -> v2: cosmetics (equipped loadout and owned items) were added. Start empty; starters
   *  are filled in when the save is read. */
  1: (state) => ({ ...state, cosmetics: { loadout: { slots: {}, cards: {} }, owned: {} } }),
  2: v2ToV3,
};

/**
 * v2 -> v3: production moved from "producer id -> plot count" to plots/slots with chosen
 * contents, expansions, unlocked tree kinds and mine levels; dungeon clears are recorded; the
 * placeholder content (example_*) was replaced by the beta content. Ids are a snapshot of the
 * v0.2 and v0.3 data, so this step keeps working whatever the content becomes later.
 */
function v2ToV3(state: Record<string, unknown>): Record<string, unknown> {
  const { producers, ...rest } = state;
  const counts = isRecord(producers) ? producers : {};
  // v0.2 had one start plot per job and no way to buy more; anything above one is an expansion.
  const job = (legacyId: string, newId: string) => {
    const n = Math.max(1, Math.floor(Number(counts[legacyId] ?? 0)) || 0);
    return { expansions: n - 1, plots: Array<string>(n).fill(newId) };
  };
  return {
    ...rest,
    resources: renameKeys(state['resources'], LEGACY_RESOURCES),
    pity: renameKeys(state['pity'], { example_boss: 'root_warden' }),
    activeDungeonId:
      state['activeDungeonId'] === 'example_dungeon' ? 'mossy_cellar' : state['activeDungeonId'],
    production: {
      logging: job('example_tree', 'oak'),
      mining: job('example_mine', 'copper_quarry'),
      unlockedTrees: [],
      mineLevels: {},
    },
    clearedDungeons: [],
  };
}

const LEGACY_RESOURCES: Record<string, string> = {
  example_wood: 'oak_wood',
  example_ore: 'copper_ore',
  example_portal_shard: 'moss_sigil',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Copies a record with some keys renamed; non-records are returned as they are. */
function renameKeys(value: unknown, names: Record<string, string>): unknown {
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [names[k] ?? k, v]));
}

/** Runs every step from `fromVersion` up to `targetVersion`, in order. */
export function migrateState(
  state: unknown,
  fromVersion: number,
  targetVersion: number,
  table: MigrationTable,
): unknown {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new SaveError('invalid-format', `Invalid save version: ${String(fromVersion)}`);
  }
  if (fromVersion > targetVersion) {
    throw new SaveError(
      'future-version',
      `This save is from a newer version of the game (save format ${fromVersion}, this app supports up to ${targetVersion}). Update the game to load it.`,
    );
  }

  let current = state;
  for (let version = fromVersion; version < targetVersion; version++) {
    const step = table[version];
    if (!step) {
      throw new SaveError(
        'missing-migration',
        `No migration from save format ${version} to ${version + 1}.`,
      );
    }
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      throw new SaveError('invalid-format', 'Save data is not an object.');
    }
    current = step(current as Record<string, unknown>);
  }
  return current;
}
