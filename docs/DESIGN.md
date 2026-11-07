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

| Resource               | Buys                            |
| ---------------------- | ------------------------------- |
| Ore                    | Damage, mine upgrades           |
| Wood                   | Plot expansions, new tree kinds |
| Higher-tier wood / ore | Card tier-ups                   |

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

### Special dungeons

- Separate from the main dungeon progression.
- They exist as **tests of the player's strength** and as the source of **cosmetic upgrade materials** and other customization bonuses.
- Inspired by how many gacha games handle this (Brave Frontier is a direct reference for the game in several respects).

## 5. Cards

- Collectible and **job-specific**: mining, logging, fighting.
- Each job has **1 main card + 3 support cards**.
- **Fighting:** the damage stat is the base power. The main card shapes how it is dealt (ticks, big hits, bursts). Support cards add bonuses or extra attacks.
- **Production jobs** work the same way: main card shapes the output, supports add bonuses.

### Rarity

Seven rarities, in order: **Common, Rare, Epic, Legendary, Mythic, Exotic, Void**. Rarity applies to cards and cosmetics.

- Rarity sets the **base colour of the card body**: steel grey, blue, purple, amber, then increasingly unusual finishes for the advanced ones: neon pink (Mythic), neon orange (Exotic), metallic black chrome (Void).
- The job (mining, logging, fighting) is shown as a label, not by colour.

### Ranks

Bronze ★1–6 → Silver ★1–6 → Gold ★1–6 → Prismatic ★1–6 (max).

- ★6 of each tier is a **big upgrade plus a visual change**.
- Star colors follow the tier; **Prismatic stars are animated**.
- **★6 shine:** at ★6 the stars get a polished light sweep that moves back and forth across the star glyphs in a loop, coloured to the tier. On Prismatic it blends with the animated stars. ★1–5 have no shine.
- **★6 evolution:** each tier's ★6 adds a small, escalating upgrade to the card's look (Bronze faintest, Prismatic strongest), never a full redesign.
- **Prismatic is the top tier for now and must look clearly different from ★1:** its own animated ring and rainbow tier name. Prismatic ★6 adds a much stronger treatment (thick fast ring, aura, rising motes).
- **Rank visuals never clash with cosmetics:** rank effects sit outside the card edge (rings, aura) and on the stars; cosmetics sit inside the edge. Stars are never covered by a cosmetic.
- **Duplicates / shards add stars.**
- **Tier-ups cost a dungeon material** (see resource uses above).
- Duplicates beyond max rank convert to **shards**, spendable in a shop.

## 6. Summon portals (gacha)

- Several portals (cards, cosmetics, more later), each with its **own pool** and a **cost resource from specific dungeons**.
- **In-game currency only** — no real-money purchases.
- Rarities and **pity** apply.

## 7. Cosmetics

### Customization-driven UI

- The UI itself is part of the customization system: **nothing visual is hardcoded**. The default look is just the **starter set** of cosmetics.
- UI style: simple **card-based UI on a plain table**. More of the UI (for example colour themes or layout skins) can become customizable slots later.
- **Starter set: Gilded Nocturne.** Gilded card anatomy (body, name plate, art window, stat panel) with calm, flat surfaces and thin gold hairlines; light stone table; the Outfit typeface. Each layer of the card is a place where more extravagant cosmetics can add decoration later.
- **First unlockable set: Gilded Tradition** (classic trading card: crimson frame, gold plate, rainbow foil). The richer "Medium" gilt variant of the starter is an unlockable border.

### Slots

**Seven global slots:**

1. Card border
2. Card finish (holo, foil, …). Holo finishes are full-card, animated and restrained, using geometric or fluid patterns.
3. Attack animation. Attacks are automatic; one attack item contains a variant per job. Starter: a slash that appears and fades at changing angles and positions (fighting, with sparks; logging, with wood chips) and a heavy hit (mining: shockwave, cracks, rock chips, dust).
4. Tick damage style
5. Number style
6. Table background
7. Cursor

- Some rare cosmetics are **exclusive to one specific card** and override the global slot on that card only.
- **Sources:** dungeon drops, cosmetics portal, prestige, achievements.
- **Owning** an item gives a small permanent buff.
- **Equipping a matching set** gives an extra bonus; each set must look coherent when fully equipped.

### Upgrade levels

- Cosmetics have **upgrade levels**. Each level keeps everything from the level below and adds one visible element, so an upgrade always reads as "more", never "different".
- Levels are unlocked with **duplicates**; each upgrade also costs **specific materials from special dungeons** (see Combat).

## 8. Saves

- JSON on disk, with **autosave**.
- **Export / import** supported.
- **Versioned with migrations.**
- **Offline progress** is capped at around **8 hours**.
