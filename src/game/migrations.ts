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
};

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
