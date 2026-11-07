# Basic Incremental — Game Design

Source of truth for game design. Anything not covered here is an open question: ask before inventing it.

## 1. Distribution

- Windows desktop game, packaged as an `.exe`. Stack: Electron + TypeScript.
- Auto-updates from GitHub Releases.
- Pushing a version tag (e.g. `v0.3.0`) triggers GitHub Actions to build the exe and publish a GitHub Release.
- The app checks for updates on launch.
- The exe is unsigned; that is acceptable.

## 2. Production

Two production jobs, **mining** and **logging**. Each produces its own resources, and higher tiers give different, better resources.

### Planning layer (plots / slots)
- Production runs on a limited, expandable number of plots (logging) or slots (mining).
- The player decides what to put in them; expanding capacity is a core progression lever.

### Logging
- Starts with **one tree plot**.
- Upgrades add more plots and unlock new **tree kinds**; each tree kind yields a different wood.

### Mining
- Works the same way as logging (limited slots, upgrades add capacity, higher mine types yield different ores).
- **New mine types are unlocked via dungeon expeditions.**

### Resource uses (starting point)
| Resource | Buys |
|---|---|
| Ore | Damage, mine upgrades |
| Wood | Plot expansions, new tree kinds |
| Higher-tier wood / ore | Card tier-ups |

This is a starting point and will be tuned.

## 3. Prestige

- Prestige **resets**: plots, mine levels, resources.
- Prestige **grants**: a permanent prestige currency.
- Prestige **persists through**: damage, cards, cosmetics, and unlocked dungeons / trees / mines.

## 4. Combat

- **Damage** is a stat bought with resources and kept through prestige.
- **Bosses** are HP walls, auto-fought in parallel with everything else (no active combat input), and they respawn so they can be farmed.
- Boss HP scales **slowly** with prestige count.
- New, harder **dungeons** unlock with progress.
- Dungeons drop **rare items** at low odds (e.g. 0.5%) with a **pity counter**, plus **portal resources**.

## 5. Cards

- Collectible and **job-specific**: mining, logging, fighting.
- Each job has **1 main card + 3 support cards**.
- **Fighting:** the damage stat is the base power. The main card shapes how it is dealt (ticks, big hits, bursts). Support cards add bonuses or extra attacks.
- **Production jobs** work the same way: main card shapes the output, supports add bonuses.

### Ranks
Bronze ★1–6 → Silver ★1–6 → Gold ★1–6 → Prismatic ★1–6 (max).

- ★6 of each tier is a **big upgrade plus a visual change**.
- Star colors follow the tier; **Prismatic stars are animated**.
- **Duplicates / shards add stars.**
- **Tier-ups cost a dungeon material** (see resource uses above).
- Duplicates beyond max rank convert to **shards**, spendable in a shop.

## 6. Summon portals (gacha)

- Several portals (cards, cosmetics, more later), each with its **own pool** and a **cost resource from specific dungeons**.
- **In-game currency only** — no real-money purchases.
- Rarities and **pity** apply.

## 7. Cosmetics

- UI style: simple **card-based UI on a plain table**.
- **Six global slots:**
  1. Card border
  2. Card finish (holo, foil, …)
  3. Attack animation
  4. Tick damage style
  5. Number style
  6. Table background
- Some rare cosmetics are **exclusive to one specific card**.
- **Sources:** dungeon drops, cosmetics portal, prestige, achievements.
- **Owning** an item gives a small permanent buff.
- **Equipping a matching set** gives an extra bonus.

## 8. Saves

- JSON on disk, with **autosave**.
- **Export / import** supported.
- **Versioned with migrations.**
- **Offline progress** is capped at around **8 hours**.
