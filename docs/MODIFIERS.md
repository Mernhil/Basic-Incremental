# Modifier system

Every tunable number in the game goes through one pipeline (DESIGN.md 11.5), so balancing means editing data. Code: `src/game/modifiers.ts`. Stats and data shape: `STATS` and `modifierSchema` in `src/data/schemas.ts`.

## A modifier

```json
{ "stat": "production.rate", "kind": "percent", "value": "5", "scope": { "job": "logging" } }
```

- **stat**: one of `STATS` (production rate, damage, boss HP, drop chance, pity, portal amount, offline cap, XP, loadout cost cap, summon pity, cost multiplier).
- **kind** and the fixed order they apply in:
  1. `flat`: added (all flats summed)
  2. `percent`: all percents summed, then applied once (`"5"` = +5%)
  3. `mult`: each one multiplies
  4. `set`: replaces the value (last one wins)
  5. `min`: floor (the highest floor applies)
  6. `max`: cap (the lowest cap applies, and a cap beats a floor)
- **scope** (optional): `job`, `producer`, `resource`, `dungeon`, `portal`. Every key given must match where the stat is read; no scope means it applies everywhere. Unknown ids fail validation.

## Sources

`collectModifiers(state, content)` gathers every active modifier with its source (`cosmetic`, `set`, `skill`, `enhancement`, `card`, `prestige`, `achievement`). Today it reads:

- owned cosmetics (`ownedModifiers` in `cosmetics.json`), worn or not;
- fully equipped sets (`modifiers` in `sets.json`).

New systems add their modifiers inside `collectModifiers`; callers never change.

## Reading a stat

- `computeStat(stat, base, modifiers, context)` returns the value plus the modifiers that applied, in order, for tooltip breakdowns.
- `statValue(...)` returns only the value.
- Game helpers that already use it: `producerRate`, `effectiveDamage`, `bossMaxHp`, `effectiveDrops`, `offlineCapMs`.

## Adding a stat

Add it to `STATS` with a comment saying which scope keys it reads, then read it with `statValue` where the number is used. Clamp in the caller when a stat has natural limits (chances 0..1, counts at least 1).
