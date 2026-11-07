/**
 * All player-facing text for the main screen, in one place so terms stay consistent:
 * "save" (never "file" or "data"), "boss", "bars" for HP, "Export save" / "Import save".
 * Written with the ux-copy guidelines: verb-first actions, errors say what happened and what to do.
 */
export const COPY = {
  update: {
    message: 'Update ready — restart to install',
    action: 'Restart',
  },
  away: {
    title: 'While you were away',
    duration: (d: string) => `You were away for ${d}.`,
    capped: (cap: string) => `Offline progress is capped at ${cap}.`,
    gain: (amount: string, resource: string) => `+${amount} ${resource}`,
    kills: (n: number) => (n === 1 ? 'Defeated the boss once' : `Defeated the boss ${n} times`),
    drop: (item: string, n: number) => `Found ${item}${n > 1 ? ` ×${n}` : ''}`,
    dismiss: 'Continue',
  },
  load: {
    usedBackup: "Your latest save couldn't be read, so the previous backup was loaded.",
    startedFresh:
      "Your save couldn't be read, so a new game started. The damaged save is kept in the saves folder.",
    badData: "The game data is invalid, so the game can't start.",
    failed: "The game couldn't start.",
  },
  save: {
    heading: 'Save',
    export: 'Export save',
    import: 'Import save',
    placeholder: 'Paste an exported save here, then choose Import save.',
    exported: 'Save copied to the clipboard and shown below. Keep it somewhere safe.',
    exportedNoClipboard: 'Your save is shown below. Copy it and keep it somewhere safe.',
    importEmpty: 'Paste an exported save first.',
    importConfirm:
      'Replace your current progress with this save? Your current save is kept as a backup.',
    imported: 'Save imported.',
    importFailed: "That save couldn't be imported.",
    writeFailed: (reason: string) =>
      `Couldn't save (${reason}). The game keeps running and will try again in 30 seconds.`,
  },
  table: {
    boss: 'Boss',
    loadout: 'Fighting loadout',
    production: 'Production',
    resources: 'Resources',
    main: 'Main',
    support: 'Support',
    emptySlot: 'Empty support slot',
    plots: (n: number) => (n === 1 ? '1 plot' : `${n} plots`),
    locked: (by: string) => `Unlocks from ${by}`,
    perSecond: (amount: string) => `${amount}/s`,
  },
  hp: {
    bars: (n: number) => `×${n}`,
    value: (hp: string, max: string) => `${hp} / ${max}`,
    label: (hp: string, max: string, bars: number) =>
      `Boss HP ${hp} of ${max}, ${bars} ${bars === 1 ? 'bar' : 'bars'} left`,
  },
} as const;
