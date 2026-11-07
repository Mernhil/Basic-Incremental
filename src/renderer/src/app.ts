import { ContentValidationError, loadContent, type Content } from '../../data';
import {
  Decimal,
  GameLoop,
  SaveError,
  createInitialState,
  createSaveText,
  defaultRng,
  exportSaveString,
  formatDecimal,
  formatDuration,
  importSaveString,
  loadBestSave,
  simulateOffline,
  bossMaxHp,
  type GameState,
  type OfflineSummary,
} from '../../game';

const TICK_INTERVAL_MS = 100;
const AUTOSAVE_INTERVAL_MS = 30_000;

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

function showFatal(error: unknown): void {
  const box = el('fatal');
  box.hidden = false;
  box.textContent =
    error instanceof ContentValidationError
      ? `The game data is invalid and the game cannot start.\n\n${error.message}`
      : `The game failed to start.\n\n${error instanceof Error ? error.message : String(error)}`;
}

function describeAway(summary: OfflineSummary, content: Content): string {
  const lines = [
    `Away for ${formatDuration(summary.elapsedMs)}` +
      (summary.capped ? ` (progress capped at ${formatDuration(summary.simulatedMs)})` : ''),
  ];
  for (const [id, amount] of Object.entries(summary.gains)) {
    lines.push(`+${formatDecimal(amount)} ${content.resourceById.get(id)?.name ?? id}`);
  }
  if (summary.bossKills > 0) lines.push(`Boss defeated ${summary.bossKills} times`);
  for (const [id, count] of Object.entries(summary.drops)) lines.push(`Rare drop: ${id} x${count}`);
  return lines.join('\n');
}

function describeStatus(state: GameState, content: Content): string {
  const lines = content.resources.map(
    (r) => `${r.name}: ${formatDecimal(state.resources[r.id] ?? new Decimal(0))}`,
  );
  const dungeon = state.activeDungeonId
    ? content.dungeonById.get(state.activeDungeonId)
    : undefined;
  lines.push('');
  lines.push(`Damage: ${formatDecimal(state.damage)} / s`);
  if (dungeon) {
    const max = bossMaxHp(dungeon, state.prestigeCount);
    const hp = state.bossHp ?? max;
    lines.push(
      `${dungeon.boss.name}: ${formatDecimal(hp)} / ${formatDecimal(max)} HP  ` +
        `(kills: ${state.stats.bossKills}, pity: ${state.pity[dungeon.boss.id] ?? 0}/${dungeon.drops.rare.pityThreshold})`,
    );
  }
  return lines.join('\n');
}

/** Loads content and the save, applies offline progress, then runs the game loop. */
export async function startGame(): Promise<void> {
  let content: Content;
  try {
    content = loadContent();
  } catch (error) {
    showFatal(error);
    return;
  }

  const warning = el('warning');
  const files = await window.api.readSave();
  const best = loadBestSave(files.primary, files.backup, content);
  if (best.errors.length > 0) {
    warning.hidden = false;
    warning.textContent =
      best.source === 'backup'
        ? 'Your latest save could not be read, so the previous backup was loaded.'
        : 'Your save could not be read, so a new game was started. The damaged file was kept in the saves folder.';
  }

  const startedAt = Date.now();
  let state = best.save?.state ?? createInitialState(content);
  if (best.save) {
    const offline = simulateOffline(state, content, best.save.savedAt, startedAt, defaultRng);
    state = offline.state;
    if (offline.summary) {
      el('away-text').textContent = describeAway(offline.summary, content);
      el('away').hidden = false;
    }
  }
  el('away-close').addEventListener('click', () => {
    el('away').hidden = true;
  });

  const loop = new GameLoop(state, content, defaultRng, startedAt);
  const saveMessage = el('save-message');
  const saveText = el<HTMLTextAreaElement>('save-text');

  const save = async (): Promise<void> => {
    loop.step(Date.now());
    try {
      await window.api.writeSave(createSaveText(loop.state, Date.now()));
    } catch (error) {
      saveMessage.textContent = `Could not save: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  const render = (): void => {
    el('status').textContent = describeStatus(loop.state, content);
  };

  setInterval(() => {
    loop.step(Date.now());
    render();
  }, TICK_INTERVAL_MS);
  setInterval(() => void save(), AUTOSAVE_INTERVAL_MS);
  window.api.onFlushRequest(() => {
    void save().finally(() => window.api.flushDone());
  });

  el('save-tools').hidden = false;
  el('export-btn').addEventListener('click', () => {
    loop.step(Date.now());
    saveText.value = exportSaveString(loop.state, Date.now());
    saveText.select();
    saveMessage.textContent = 'Copy this text to back up your save.';
  });
  el('import-btn').addEventListener('click', () => {
    try {
      const imported = importSaveString(saveText.value, content);
      if (!window.confirm('Replace your current progress with the imported save?')) return;
      loop.reset(imported.state, Date.now());
      saveText.value = '';
      saveMessage.textContent = 'Save imported.';
      void save();
    } catch (error) {
      saveMessage.textContent =
        error instanceof SaveError ? error.message : 'Could not import that save.';
    }
  });

  render();
  await save(); // write immediately so a fresh game has a save file from the start
}
