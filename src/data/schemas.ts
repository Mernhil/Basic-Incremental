import { z } from 'zod';
import { Decimal, isDecimalString } from '../game/num';

/** A number written as a string in data files ("500", "1e12"), parsed to a Decimal. */
const decimal = z
  .string()
  .refine(isDecimalString, { message: 'must be a number string such as "100" or "1.5e12"' })
  .transform((s) => new Decimal(s));

const positiveDecimal = decimal.refine((d) => d.gt(0), { message: 'must be greater than 0' });
const nonNegativeDecimal = decimal.refine((d) => d.gte(0), { message: 'must be 0 or more' });

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
export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export const MAIN_ABILITY_KINDS = ['ticks', 'bigHits', 'bursts'] as const;
export const SUPPORT_EFFECT_KINDS = ['damageBonus', 'productionBonus', 'extraAttack'] as const;

const cardBase = { id, name, job: z.enum(JOBS), rarity: z.enum(RARITIES) };

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

export const COSMETIC_SLOTS = [
  'cardBorder',
  'cardFinish',
  'attackAnimation',
  'tickDamageStyle',
  'numberStyle',
  'tableBackground',
] as const;

export const cosmeticSchema = z.strictObject({
  id,
  name,
  slot: z.enum(COSMETIC_SLOTS),
  rarity: z.enum(RARITIES),
  /** Matching-set bonus applies when every slot is equipped from the same set. */
  set: id.nullable(),
  /** Rare cosmetics tied to a single card; null = usable with any card. */
  exclusiveCard: id.nullable(),
  /** Small permanent buff granted just for owning it. */
  ownedBuff: z.strictObject({
    stat: z.enum(['damage', 'production']),
    percent: z.number().min(0).max(100),
  }),
});

export const contentSchemas = {
  resources: z.array(resourceSchema),
  trees: z.array(treeSchema),
  mines: z.array(mineSchema),
  cards: z.array(cardSchema),
  dungeons: z.array(dungeonSchema),
  cosmetics: z.array(cosmeticSchema),
} as const;

export type Resource = z.output<typeof resourceSchema>;
export type Tree = z.output<typeof treeSchema>;
export type Mine = z.output<typeof mineSchema>;
export type Card = z.output<typeof cardSchema>;
export type Dungeon = z.output<typeof dungeonSchema>;
export type Cosmetic = z.output<typeof cosmeticSchema>;
