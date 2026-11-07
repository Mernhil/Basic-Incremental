import { ContentValidationError, loadContent, type Card, type Content } from '../../data';
import {
  Decimal,
  GameLoop,
  SaveError,
  baseDamage,
  bossMaxHp,
  collectModifiers,
  computeStat,
  createInitialState,
  createSaveText,
  defaultRng,
  exportSaveString,
  formatDecimal,
  formatDuration,
  hpBarState,
  importSaveString,
  loadBestSave,
  producerCounts,
  resolveCard,
  resolveGlobal,
  simulateOffline,
  type GameState,
  type OfflineSummary,
} from '../../game';
import { COPY } from './copy';
import { applyGlobalTheme, assertVisualsImplemented } from './theme/apply';
import { playHit, showTick } from './theme/effects';
import { createCard, type CardProps, type CardView } from './ui/card';
import { createHpStack } from './ui/hpStack';
import { createShell, frame, h, PAGES, placeholderPage, type Currency } from './shell/shell';
import { statTip } from './shell/stats';
import { attachTooltip } from './shell/tooltip';

const TICK_INTERVAL_MS = 100;
const AUTOSAVE_INTERVAL_MS = 30_000;
const PRODUCTION_HIT_MS = 1000;

function showFatal(root: HTMLElement, error: unknown): void {
  const box = h('pre', 'fatal');
  box.setAttribute('role', 'alert');
  box.textContent =
    error instanceof ContentValidationError
      ? `${COPY.load.badData}\n\n${error.message}`
      : `${COPY.load.failed}\n\n${error instanceof Error ? error.message : String(error)}`;
  root.append(box);
}

function awayLines(summary: OfflineSummary, content: Content): string[] {
  const lines = [COPY.away.duration(formatDuration(summary.elapsedMs))];
  if (summary.capped) lines.push(COPY.away.capped(formatDuration(summary.capMs)));
  for (const [id, amount] of Object.entries(summary.gains)) {
    lines.push(COPY.away.gain(formatDecimal(amount), content.resourceById.get(id)?.name ?? id));
  }
  if (summary.bossKills > 0) lines.push(COPY.away.kills(summary.bossKills));
  for (const [id, count] of Object.entries(summary.drops)) {
    const name = content.cosmeticById.get(id)?.name ?? content.cardById.get(id)?.name ?? id;
    lines.push(COPY.away.drop(name, count));
  }
  return lines;
}

const SUPPORT_LABELS = {
  damageBonus: 'Damage',
  productionBonus: 'Production',
  extraAttack: 'Extra hits',
} as const;

function loadoutProps(content: Content, state: GameState, card: Card): CardProps {
  const rank = card.startRank; // per-card ranks arrive with the card system
  const stats: CardProps['stats'] =
    card.role === 'main'
      ? [
          {
            label: 'Damage',
            value: `${formatDecimal(baseDamage(state, content).mul(card.mainAbility.multiplier))}/s`,
          },
          { label: 'Hits every', value: `${card.mainAbility.intervalSeconds}s` },
        ]
      : [
          { label: 'Bonus', value: `+${formatDecimal(card.supportEffect.value.mul(100))}%` },
          { label: 'To', value: SUPPORT_LABELS[card.supportEffect.kind] },
        ];
  return {
    name: card.name,
    label: card.role === 'main' ? COPY.table.main : COPY.table.support,
    job: card.job,
    emblem: card.role === 'main' ? 'blade' : 'gem',
    rank,
    stats,
    theme: resolveCard(content, state.cosmetics.loadout, {
      id: card.id,
      rank,
      rarity: card.rarity,
    }),
  };
}

/** Loads content and the save, applies offline progress, builds the table and runs the loop. */
export async function startGame(root: HTMLElement, version: string): Promise<void> {
  let content: Content;
  try {
    content = loadContent();
    assertVisualsImplemented(content);
  } catch (error) {
    showFatal(root, error);
    return;
  }

  // ---- load ----
  const files = await window.api.readSave();
  const best = loadBestSave(files.primary, files.backup, content);
  const startedAt = Date.now();
  let state = best.save?.state ?? createInitialState(content);
  let summary: OfflineSummary | null = null;
  if (best.save) {
    const offline = simulateOffline(state, content, best.save.savedAt, startedAt, defaultRng);
    state = offline.state;
    summary = offline.summary;
  }
  const loop = new GameLoop(state, content, defaultRng, startedAt);
  applyGlobalTheme(content, loop.state.cosmetics.loadout);

  // ---- layout ----
  const KIND_ICON = { wood: 'wood', ore: 'ore', material: 'material', portal: 'portal' } as const;
  const currencies: Currency[] = content.resources.map((r) => ({
    id: r.id,
    name: r.name,
    icon: KIND_ICON[r.kind],
    tip: () => `${r.name}: ${formatDecimal(loop.state.resources[r.id] ?? new Decimal(0))}`,
  }));
  const shell = createShell({ version, currencies, levelTip: COPY.shell.levelTip });
  shell.setLevel(1, 0, '');
  const home = shell.page('home');
  for (const p of PAGES) {
    if (p.id !== 'home' && p.id !== 'settings') placeholderPage(shell.page(p.id), p.id);
  }
  const app = shell.notices;

  if (best.errors.length > 0) {
    const warning = h(
      'p',
      'notice notice--warning',
      best.source === 'backup' ? COPY.load.usedBackup : COPY.load.startedFresh,
    );
    warning.setAttribute('role', 'alert');
    app.append(warning);
  }

  if (summary) {
    const away = frame(COPY.away.title);
    away.el.classList.add('away');
    const list = h('ul', 'away__list');
    for (const line of awayLines(summary, content)) list.append(h('li', '', line));
    const ok = h('button', 'button', COPY.away.dismiss);
    ok.type = 'button';
    ok.addEventListener('click', () => {
      away.el.remove();
      shell.scrollToTop();
    });
    away.body.append(list, ok);
    app.append(away.el);
    queueMicrotask(() => ok.focus());
  }

  const table = h('div', 'table');
  home.append(table);

  // boss
  const dungeon = loop.state.activeDungeonId
    ? content.dungeonById.get(loop.state.activeDungeonId)
    : undefined;
  let boss: CardView | null = null;
  const hp = createHpStack();
  if (dungeon) {
    const bossRank = { tier: 'bronze', stars: 1 } as const;
    boss = createCard({
      name: dungeon.boss.name,
      label: COPY.table.boss,
      job: 'fighting',
      emblem: 'golem',
      rank: bossRank,
      boss: true,
      stats: [
        { label: '', value: '' },
        { label: '', value: '' },
      ],
      theme: resolveCard(content, loop.state.cosmetics.loadout, {
        id: dungeon.boss.id,
        rank: bossRank,
        rarity: 'common',
      }),
    });
    boss.hpSlot.append(hp.el);
  }
  const battle = frame(dungeon?.name ?? COPY.table.boss, dungeon ? COPY.table.boss : undefined);
  battle.el.classList.add('table__boss');
  if (boss) battle.body.append(boss.el);
  const damageRow = h('dl', 'stat-row');
  const damageLabel = h('dt', '', COPY.home.damage);
  const damageValue = h('dd', 'bi-num');
  damageValue.tabIndex = 0;
  damageValue.classList.add('has-tip');
  damageRow.append(damageLabel, damageValue);
  const damageStat = () =>
    computeStat(
      'combat.damage',
      baseDamage(loop.state, content),
      collectModifiers(loop.state, content),
      {
        job: 'fighting',
        dungeon: dungeon?.id,
      },
    );
  attachTooltip(damageValue, () => statTip(content, COPY.home.damageTip, damageStat(), '/s'));
  battle.body.append(damageRow);
  table.append(battle.el);

  // loadout: 1 main + 3 supports
  const loadout = frame(COPY.table.loadout);
  loadout.el.classList.add('table__loadout');
  const slots = h('div', 'loadout');
  const main = content.cards.find((c) => c.job === 'fighting' && c.role === 'main');
  const supports = content.cards
    .filter((c) => c.job === 'fighting' && c.role === 'support')
    .slice(0, 3);
  const cardViews: Array<{ view: CardView; card: Card }> = [];
  for (const card of [main, ...supports]) {
    if (!card) continue;
    const view = createCard(loadoutProps(content, loop.state, card));
    cardViews.push({ view, card });
    slots.append(view.el);
  }
  for (let i = supports.length; i < 3; i++) {
    const empty = h('div', 'slot-empty', COPY.table.emptySlot);
    slots.append(empty);
  }
  const fit = h('div', 'loadout-fit');
  fit.append(slots);
  loadout.body.append(fit);
  table.append(loadout.el);

  // production
  const production = frame(COPY.table.production);
  production.el.classList.add('production');
  const tiles = h('div', 'production__tiles');
  const producerTiles: Array<{
    stage: HTMLElement;
    emblem: SVGElement;
    job: 'logging' | 'mining';
    id: string;
  }> = [];
  const producers = [
    ...content.trees.map((p) => ({ p, job: 'logging' as const, emblem: 'tree' })),
    ...content.mines.map((p) => ({ p, job: 'mining' as const, emblem: 'rock' })),
  ];
  for (const { p, job, emblem } of producers) {
    const tile = h('article', 'prod');
    const stage = h('div', 'prod__stage');
    stage.innerHTML = `<svg class="bi-card__emblem prod__emblem" viewBox="0 0 100 100" aria-hidden="true">${
      emblem === 'tree'
        ? '<path d="M50 10 76 46H62L82 70H18L38 46H24Z"/><path d="M44 70H56V90H44Z"/>'
        : '<path d="M14 70 26 38 46 26 70 30 86 52 82 76 54 86 28 84Z"/>'
    }</svg>`;
    const info = h('div', 'prod__info');
    const plots = producerCounts(loop.state, content)[p.id] ?? 0;
    const resource = content.resourceById.get(p.resource)?.name ?? p.resource;
    info.append(h('h3', 'prod__name', p.name));
    if (plots > 0) {
      info.append(
        h('p', 'prod__meta', COPY.table.plots(plots)),
        h(
          'p',
          'prod__meta bi-num',
          `${resource} ${COPY.table.perSecond(formatDecimal(p.baseRate.mul(plots)))}`,
        ),
      );
      producerTiles.push({ stage, emblem: stage.querySelector('svg')!, job, id: p.id });
    } else {
      tile.classList.add('prod--locked');
      const by =
        'unlockedByDungeon' in p && p.unlockedByDungeon
          ? content.dungeonById.get(p.unlockedByDungeon)?.name
          : null;
      info.append(h('p', 'prod__meta', by ? COPY.table.locked(by) : COPY.table.plots(0)));
    }
    tile.append(stage, info);
    tiles.append(tile);
  }
  production.body.append(tiles);
  home.append(production.el);

  // save tools (Settings page)
  const toolsFrame = frame(COPY.save.heading);
  const tools = toolsFrame.body;
  tools.classList.add('tools');
  const exportBtn = h('button', 'button', COPY.save.export);
  const importBtn = h('button', 'button', COPY.save.import);
  exportBtn.type = 'button';
  importBtn.type = 'button';
  const saveText = h('textarea', 'tools__text');
  saveText.rows = 3;
  saveText.spellcheck = false;
  saveText.placeholder = COPY.save.placeholder;
  saveText.setAttribute('aria-label', COPY.save.placeholder);
  const message = h('p', 'tools__message');
  message.setAttribute('role', 'status');
  const buttons = h('div', 'tools__buttons');
  buttons.append(exportBtn, importBtn);
  tools.append(buttons, saveText, message);
  shell.page('settings').append(toolsFrame.el);

  root.replaceChildren(shell.el);

  // ---- behaviour ----
  const rendered = (): void => {
    const s = loop.state;
    if (dungeon && boss) {
      const max = bossMaxHp(dungeon, s.prestigeCount, collectModifiers(s, content));
      const current = s.bossHp ?? max;
      const bars = hpBarState(current, max, dungeon.boss.hpBars);
      hp.update(bars, formatDecimal(current), formatDecimal(max), current.div(max).toNumber());
    }
    for (const r of content.resources) {
      const amount = s.resources[r.id] ?? new Decimal(0);
      shell.setCurrency(r.id, formatDecimal(amount), amount.gt(0));
    }
    damageValue.textContent = `${formatDecimal(damageStat().value)}/s`;
  };

  const save = async (): Promise<void> => {
    loop.step(Date.now());
    try {
      await window.api.writeSave(createSaveText(loop.state, Date.now()));
    } catch (error) {
      message.textContent = COPY.save.writeFailed(
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  window.setInterval(() => {
    loop.step(Date.now());
    rendered();
  }, TICK_INTERVAL_MS);

  // Visual hits follow the main card's rhythm; damage itself is continuous in the game loop.
  const attack = () => resolveGlobal(content, loop.state.cosmetics.loadout).attack.visual.effects;
  if (boss && main && main.role === 'main') {
    const view = boss;
    window.setInterval(() => {
      if (document.hidden) return;
      const effect = attack()?.fighting;
      if (effect)
        playHit(effect, view.art, { rng: defaultRng, target: view.art.querySelector('svg') });
      const dealt = baseDamage(loop.state, content)
        .mul(main.mainAbility.multiplier)
        .mul(main.mainAbility.intervalSeconds);
      showTick(view.art, formatDecimal(dealt), { rng: defaultRng });
    }, main.mainAbility.intervalSeconds * 1000);
  }
  window.setInterval(() => {
    if (document.hidden) return;
    for (const tile of producerTiles) {
      const effect = attack()?.[tile.job];
      if (effect) playHit(effect, tile.stage, { rng: defaultRng, target: tile.emblem });
      const producer = [...content.trees, ...content.mines].find((p) => p.id === tile.id)!;
      const gain = producer.baseRate
        .mul(producerCounts(loop.state, content)[tile.id] ?? 0)
        .mul(PRODUCTION_HIT_MS / 1000);
      showTick(tile.stage, `+${formatDecimal(gain)}`, { rng: defaultRng });
    }
  }, PRODUCTION_HIT_MS);

  window.setInterval(() => void save(), AUTOSAVE_INTERVAL_MS);
  window.api.onFlushRequest(() => {
    void save().finally(() => window.api.flushDone());
  });

  exportBtn.addEventListener('click', () => {
    loop.step(Date.now());
    saveText.value = exportSaveString(loop.state, Date.now());
    saveText.select();
    navigator.clipboard
      ?.writeText(saveText.value)
      .then(() => (message.textContent = COPY.save.exported))
      .catch(() => (message.textContent = COPY.save.exportedNoClipboard));
  });
  importBtn.addEventListener('click', () => {
    if (!saveText.value.trim()) {
      message.textContent = COPY.save.importEmpty;
      return;
    }
    try {
      const imported = importSaveString(saveText.value, content);
      if (!window.confirm(COPY.save.importConfirm)) return;
      loop.reset(imported.state, Date.now());
      applyGlobalTheme(content, loop.state.cosmetics.loadout);
      for (const { view, card } of cardViews) view.update(loadoutProps(content, loop.state, card));
      saveText.value = '';
      message.textContent = COPY.save.imported;
      void save();
    } catch (error) {
      message.textContent = error instanceof SaveError ? error.message : COPY.save.importFailed;
    }
  });

  rendered();
  await save(); // a fresh game gets a save file right away
}
