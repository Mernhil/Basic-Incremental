import { z } from 'zod';
import { Decimal, isDecimalString } from '../game/num';

/** A number written as a string in data files ("500", "1e12"), parsed to a Decimal. */
const decimal = z
  .string()
  .refine(isDecimalString, { message: 'must be a number string such as "100" or "1.5e12"' })
  .transform((s) => new Decimal(s));

const positiveDecimal = decimal.refine((d) => d.gt(0), { message: 'must be greater than 0' });

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'ids are lowercase snake_case, e.g. "oak_wood"');
const name = z.string().min(1);
const tier = z.number().int().min(1);

export const RESOURCE_KINDS = ['wood', 'ore', 'material', 'portal'] as const;
export const resourceSchema = z.strictObject({
  id,
  name,
  kind: z.enum(RESOURCE_KINDS),
  tier,
});

const costSchema = z.strictObject({ resource: id, amount: positiveDecimal });

/** Shared by trees (logging) and mines (mining). Producers sit in plots/slots. */
const producerFields = {
  id,
  name,
  tier,
  /** Resource id this producer yields. */
  resource: id,
  /** Output per second for each plot/slot running it. */
  baseRate: positiveDecimal,
  /** Plots/slots running this producer in a brand-new game. */
  startPlots: z.number().int().min(0).default(0),
  cost: z.array(costSchema),
};

export const treeSchema = z.strictObject(producerFields);

export const mineSchema = z.strictObject({
  ...producerFields,
  /** Dungeon whose expedition unlocks this mine type; null = available from the start. */
  unlockedByDungeon: id.nullable(),
});

export const JOBS = ['mining', 'logging', 'fighting'] as const;
export const RARITIES = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'exotic',
  'void',
] as const;
export type Rarity = (typeof RARITIES)[number];
export const MAIN_ABILITY_KINDS = ['ticks', 'bigHits', 'bursts'] as const;
export const SUPPORT_EFFECT_KINDS = ['damageBonus', 'productionBonus', 'extraAttack'] as const;

export const RANK_TIERS = ['bronze', 'silver', 'gold', 'prismatic'] as const;
export const MAX_STARS = 6;
export const rankSchema = z.strictObject({
  tier: z.enum(RANK_TIERS),
  stars: z.number().int().min(1).max(MAX_STARS),
});
export type Rank = z.output<typeof rankSchema>;

const cardBase = {
  id,
  name,
  job: z.enum(JOBS),
  rarity: z.enum(RARITIES),
  /** Rank a newly obtained copy starts at (Bronze ★1 unless stated). */
  startRank: rankSchema.default({ tier: 'bronze', stars: 1 }),
};

export const cardSchema = z.discriminatedUnion('role', [
  z.strictObject({
    ...cardBase,
    role: z.literal('main'),
    /** How the job's base power is delivered. */
    mainAbility: z.strictObject({
      kind: z.enum(MAIN_ABILITY_KINDS),
      multiplier: positiveDecimal,
      intervalSeconds: z.number().positive(),
    }),
  }),
  z.strictObject({
    ...cardBase,
    role: z.literal('support'),
    supportEffect: z.strictObject({
      kind: z.enum(SUPPORT_EFFECT_KINDS),
      value: positiveDecimal,
    }),
  }),
]);

export const dungeonSchema = z.strictObject({
  id,
  name,
  tier,
  boss: z.strictObject({
    id,
    name,
    hp: positiveDecimal,
    /** Boss HP is multiplied by (1 + this) for every prestige. Keep it small. */
    hpScalingPerPrestige: z.number().min(0).max(1),
    /** The HP is shown as this many stacked bars ("x N" lives). */
    hpBars: z.number().int().min(1).max(100).default(10),
  }),
  drops: z.strictObject({
    /** Rare item (card, cosmetic, ...) dropped on boss kills. */
    rare: z.strictObject({
      itemId: id,
      /** Chance per kill, 0..1 (0.005 = 0.5%). */
      chance: z.number().gt(0).max(1),
      /** Guaranteed after this many consecutive kills without the item. */
      pityThreshold: z.number().int().min(1),
    }),
    /** Portal resource granted on every kill, inclusive range. */
    portalResource: z
      .strictObject({
        resource: id,
        min: z.number().int().min(0),
        max: z.number().int().min(0),
      })
      .refine((p) => p.min <= p.max, { message: 'min must not exceed max' }),
  }),
});

// ---- Cosmetics ----------------------------------------------------------------------------
// The visual language of a cosmetic is data: CSS custom property values ("tokens"), named CSS
// recipes for things a token cannot express (decorations, patterns), and named animation
// effects. See docs/COSMETICS.md for the naming rules.

export const COSMETIC_SLOTS = [
  'border',
  'finish',
  'attack',
  'tick',
  'number',
  'table',
  'cursor',
] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

/** Slots drawn per card. Wearing them requires a minimum card rank (see wearRules). */
export const CARD_SLOTS = ['border', 'finish'] as const satisfies readonly CosmeticSlot[];
export type CardSlot = (typeof CARD_SLOTS)[number];

/** Token keys each slot may set. Each becomes the CSS variable `--bi-<key>`. */
export const SLOT_TOKENS = {
  border: [
    'border-color',
    'border-width',
    'radius',
    'plate-bg',
    'plate-line',
    'plate-ink',
    'plate-ink-muted',
    'art-line',
    'panel-bg',
    'panel-line',
    'panel-ink',
    'panel-ink-muted',
  ],
  finish: ['finish-a', 'finish-b', 'finish-c', 'finish-opacity', 'finish-speed'],
  attack: ['attack-edge', 'attack-glow', 'attack-particle'],
  tick: ['tick-color', 'tick-stroke', 'tick-crit', 'tick-size'],
  number: ['num-font', 'num-weight', 'num-color'],
  table: ['table-bg', 'table-glow', 'on-table', 'on-table-muted'],
  cursor: [],
} as const satisfies Record<CosmeticSlot, readonly string[]>;

/** Token keys a rarity may set. Each becomes `--bi-rarity-<key>`. */
export const RARITY_TOKENS = ['body', 'body-accent', 'neon', 'neon-soft'] as const;

const tokenValue = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[^;{}<>\\]*$/, 'must not contain ; { } < > or a backslash');
const recipeId = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'recipe ids are lowercase kebab-case, e.g. "filigree-2"');
const effectId = recipeId;

const cosmeticLevelSchema = z.strictObject({
  tokens: z.record(z.string(), tokenValue).default({}),
  recipes: z.array(recipeId).default([]),
  /** Attack slot: the animation used for each job. */
  effects: z.strictObject({ fighting: effectId, mining: effectId, logging: effectId }).optional(),
  /** Tick slot: the floating-number animation. */
  effect: effectId.optional(),
});

export const cosmeticSchema = z
  .strictObject({
    id,
    name,
    slot: z.enum(COSMETIC_SLOTS),
    rarity: z.enum(RARITIES),
    /** Matching-set bonus applies when every item of the set is equipped. */
    set: id.nullable(),
    /** Rare cosmetics tied to a single card; null = usable with any card. */
    exclusiveCard: id.nullable(),
    /** The one item per slot a new game starts with and falls back to. */
    starter: z.boolean().default(false),
    /** Small permanent buff granted just for owning it. */
    ownedBuff: z.strictObject({
      stat: z.enum(['damage', 'production']),
      percent: z.number().min(0).max(100),
    }),
    /**
     * Upgrade levels, lowest first. Level N shows everything from levels 1..N merged, so each
     * level only lists what it adds or changes.
     */
    levels: z.array(cosmeticLevelSchema).min(1).max(10),
  })
  .superRefine((c, ctx) => {
    const allowed = new Set<string>(SLOT_TOKENS[c.slot]);
    c.levels.forEach((level, i) => {
      for (const key of Object.keys(level.tokens)) {
        if (!allowed.has(key)) {
          ctx.addIssue({
            code: 'custom',
            path: ['levels', i, 'tokens', key],
            message: `"${key}" is not a ${c.slot} token (allowed: ${[...allowed].join(', ') || 'none'})`,
          });
        }
      }
    });
    const first = c.levels[0]!;
    if (c.slot === 'attack' && !first.effects) {
      ctx.addIssue({
        code: 'custom',
        path: ['levels', 0, 'effects'],
        message: 'attack items need an effect per job',
      });
    }
    if (c.slot === 'tick' && !first.effect) {
      ctx.addIssue({
        code: 'custom',
        path: ['levels', 0, 'effect'],
        message: 'tick items need an effect',
      });
    }
    if (c.exclusiveCard && !(CARD_SLOTS as readonly string[]).includes(c.slot)) {
      ctx.addIssue({
        code: 'custom',
        path: ['exclusiveCard'],
        message: `only card slots (${CARD_SLOTS.join(', ')}) can be exclusive to a card`,
      });
    }
    if (c.starter && (c.exclusiveCard || c.levels.length > 1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['starter'],
        message: 'a starter item cannot be card-exclusive or have upgrade levels',
      });
    }
  });

/** Rarity colours the card body. One entry per rarity. */
export const rarityStyleSchema = z
  .strictObject({
    id: z.enum(RARITIES),
    name,
    tokens: z.record(z.string(), tokenValue).default({}),
    recipes: z.array(recipeId).default([]),
  })
  .superRefine((r, ctx) => {
    const allowed = new Set<string>(RARITY_TOKENS);
    for (const key of Object.keys(r.tokens)) {
      if (!allowed.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['tokens', key],
          message: `"${key}" is not a rarity token (allowed: ${RARITY_TOKENS.join(', ')})`,
        });
      }
    }
  });

/**
 * Minimum card rank needed to WEAR an item in a card slot (owning it is always allowed).
 * `exclusive` applies to card-exclusive items.
 */
export const wearRulesSchema = z.strictObject({
  border: rankSchema,
  finish: rankSchema,
  exclusive: rankSchema,
});

export const PORTAL_KINDS = ['cards', 'cosmetics'] as const;

export const portalSchema = z.strictObject({
  id,
  name,
  kind: z.enum(PORTAL_KINDS),
  /** Portal resource (from specific dungeons) spent per summon, and how much. */
  cost: z.strictObject({ resource: id, amount: positiveDecimal }),
  /** The pool: one entry per item, picked by weight. Items must match the portal kind. */
  pool: z
    .array(z.strictObject({ itemId: id, rarity: z.enum(RARITIES), weight: z.number().positive() }))
    .min(1),
  /** Guarantee: after this many summons without this rarity or better, the next one is it. */
  pity: z.strictObject({ rarity: z.enum(RARITIES), threshold: z.number().int().min(1) }),
});

export const contentSchemas = {
  resources: z.array(resourceSchema),
  trees: z.array(treeSchema),
  mines: z.array(mineSchema),
  cards: z.array(cardSchema),
  dungeons: z.array(dungeonSchema),
  cosmetics: z.array(cosmeticSchema),
  portals: z.array(portalSchema),
  rarities: z.array(rarityStyleSchema),
  wearRules: wearRulesSchema,
} as const;

export type Resource = z.output<typeof resourceSchema>;
export type Tree = z.output<typeof treeSchema>;
export type Mine = z.output<typeof mineSchema>;
export type Card = z.output<typeof cardSchema>;
export type Dungeon = z.output<typeof dungeonSchema>;
export type Cosmetic = z.output<typeof cosmeticSchema>;
export type Portal = z.output<typeof portalSchema>;
export type CosmeticLevel = z.output<typeof cosmeticLevelSchema>;
export type RarityStyle = z.output<typeof rarityStyleSchema>;
export type WearRules = z.output<typeof wearRulesSchema>;
