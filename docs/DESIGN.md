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
- **Reassigning is free:** any unlocked tree kind / mine type can be put in any plot / slot, or the plot emptied, at any time and at no cost. Capacity is what the player pays for.
- **Expansion prices are exponential:** the n-th extra plot / slot costs `base × growth^n` (base and growth in data; skills and prestige can soften the growth). A new plot / slot starts empty.

### Logging

- Starts with **one tree plot**.
- Upgrades add more plots and unlock new **tree kinds**; each tree kind yields a different wood.
- Plot expansions are paid in **Oak Wood**. Each tree kind is unlocked once with the wood of the tier below (Ironbark with Oak Wood, Moonwillow with Ironwood).

### Mining

- Works the same way as logging (limited slots, upgrades add capacity, higher mine types yield different ores).
- **New mine types are unlocked via dungeon expeditions.**
- Starts with **one mine slot** (Copper Quarry). Slot expansions are paid in **Copper Ore**.
- **Mine levels:** each mine type also has a level, bought with its own ore on an exponential curve; every level adds a percentage to that mine's output. Slots and mine levels both reset on prestige.

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
- Boss HP is shown as **stacked bars** with a **×N** count of bars left (like a fighting-game life gauge). The current bar drains over the colour of the next one. Each boss sets its number of bars.
- Attacks are automatic. Each hit plays the equipped attack animation and a floating damage number; with reduced motion the hit animations are skipped and numbers simply fade.
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
- **★6 evolution:** each tier's ★6 adds a small, escalating upgrade to the card's look, never a full redesign:
  - Bronze ★6: shine and one thin ring just outside the card.
  - Silver ★6: shine and two rings.
  - Gold ★6: shine, two rings, a gold glow and four corner glints.
  - Prismatic ★6: shine, a thick fast rainbow ring, a breathing aura behind the card and motes rising along the sides.
  - Rings carry a thin dark edge so they read on light and dark tables. Reaching ★6 plays a one-time flash.
- **Prismatic is the top tier for now and must look clearly different from ★1:** its own animated ring and rainbow tier name. Prismatic ★6 adds a much stronger treatment (thick fast ring, aura, rising motes).
- **Rank visuals never clash with cosmetics:** rank effects sit outside the card edge (rings, aura) and on the stars; cosmetics sit inside the edge, except high-level border flourishes, which may break out at the corners (see "Breaking the edge" in section 7). Stars are never covered by a cosmetic.
- **Card enhancements** (Brave Frontier Omni SP style) unlock at a set card rank. See section 10.
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
- **Wearing card cosmetics depends on the card's rank.** Any item can be owned (and its owned buff counts), but a card must reach a minimum rank to wear it; below that it shows the starter look for that slot. Starting values: card border from Gold ★1, card finish (holo) from Prismatic ★1, card-exclusive items from Prismatic ★6. Global slots (attack, tick, numbers, table, cursor) are always worn. The thresholds live in data and are expected to be tuned.
- A holo finish covers the whole card, but card text always stays above it.
- **Sources:** dungeon drops, cosmetics portal, prestige, achievements.
- **Owning** an item gives a small permanent buff.
- **Equipping a matching set** gives an extra bonus; each set must look coherent when fully equipped.

### Upgrade levels

- Cosmetics have **upgrade levels**. Each level keeps everything from the level below and adds elements, so an upgrade always reads as "more", never "different". Example: L1 corner brackets → L2 bigger flourishes with an accent colour → L3 gems and inner detail.
- Levels are unlocked with **duplicates**; each upgrade also costs **specific materials from special dungeons** (see Combat).
- **Order of additions.** Every item follows the same ladder, and a level never goes back a step:
  1. **Shape** (brackets, flourishes, patterns)
  2. **Accent colour**
  3. **Gems**
  4. **Glow**
  5. **Ambient animation**, only at the item's **maximum level**, themed to the item (floating flames, rising bubbles, stars appearing and fading, …).

  A step may span more than one level on items with a higher maximum (e.g. two shape levels), and an item with a low maximum compresses the ladder but always keeps the order and always ends on the ambient animation.

- **Ambient animations are small, subtle and cheap:** CSS only, animating `transform` and `opacity` only, at most about 6 particles per card, no per-frame scripting, paused when the card is off screen. Many cards must be on screen at once without a frame-rate cost. Under **reduced motion** they are static (a still frame of the same elements).
- **Breaking the edge.** High-level border flourishes **may extend outside the card edge**. They coexist with rank effects by zone:
  - **Corners belong to flourishes.** A flourish may reach outside the card edge by at most about 8% of the card width, only within a corner zone (the outer fifth of each side, measured from the corner).
  - **Sides belong to rank effects.** Rank rings, the aura and rising motes run along the sides and are never hidden by a flourish.
  - **Stars are never covered.** The rank footer is a keep-clear band: no flourish, gem or animation draws over it, and bottom-corner flourishes sit above or outside it.
  - **Where they meet at a corner**, the ring passes behind the flourish and Gold ★6 corner glints twinkle on top of the flourish tips (brief, so they never hide it).
  - Card tiles in grids reserve a bleed margin so flourishes are not clipped.

## 8. Saves

- JSON on disk, with **autosave**.
- **Export / import** supported.
- **Versioned with migrations.**
- **Offline progress** is capped at around **8 hours**.

## 9. Interface layout

Inspired by Brave Frontier (screen order, upgrades, the evolution / "skin" feel, the gacha), **adapted to a desktop app**: no characters, no turn-based combat, no energy or stamina timers.

- **Header bar:** account level (with XP bar) and currencies.
- **Left sidebar navigation**, in this order: Home, Cards, Production, Dungeons, Summon, Skill Tree, Wardrobe, Achievements, Shop, Settings.
- **Framed panels** and **wide, multi-panel screens** that use the desktop width.
- **Hover tooltips** on stats, items, costs and modifiers.
- All of it is styled through the cosmetics / theming layer (section 7); nothing visual is hardcoded.

## 10. Skill tree

The skill tree is the **main balancing glue**. It has two layers, both in the beta. All effects are applied through the modifier system (section 11.5).

### a) Account tree

- **Account XP** comes from everything: harvests, kills, summons and prestiges. Account levels grant **skill points**.
- **Branches:** Logging, Mining, Combat, Summoning / Luck, Collection, Automation / Offline.
- **Respec** is supported.

### b) Card enhancements

- Brave Frontier Omni SP style. They **unlock at a set card rank** (the rank is data, per card).
- Each card has its **own list of options**. The card's **point budget is smaller than the total cost** of its options, so the same card can be built in different ways.
- Respec is supported.

## 11. Beta systems and content

Proposed for the beta and approved. Numbers are starting values and will be tuned.

### 11.1 Max cosmetic upgrade level by rarity

| Rarity    | Common | Rare | Epic | Legendary | Mythic | Exotic | Void |
| --------- | ------ | ---- | ---- | --------- | ------ | ------ | ---- |
| Max level | 2      | 3    | 4    | 5         | 5      | 6      | 6    |

Per the ladder in section 7, a Common (max 2) item is _shape → ambient animation_; a Void item (max 6) is shape, shape+, accent, gems, glow, ambient. The starter cosmetics stay at their current level counts, and the existing borders are moved onto this system.

### 11.2 Card levels

- Separate from ranks, in the Brave Frontier "Lv. 1/40" style.
- A card **levels up by doing its job**: fighting cards gain XP by defeating enemies in dungeons, logging and mining cards by harvesting. Only cards in a job's loadout are doing that job, so only they gain XP.
- Each star and each tier raises the **level cap**. Caps: Bronze 20 at ★1 rising to 40 at ★6; Silver 40 to 60; Gold 60 to 80; Prismatic 80 to 100 (the starting level cap is 20 and every star adds a fixed step).
- Level raises the card's base power, bonus strength and gauge speed.

### 11.3 Burst gauge ("Brave Burst") and harvest burst

- Each hit fills the **main fighting card's burst gauge**. When full, it fires a **big signature attack** (an animation per card, with a damage multiplier).
- **Support cards can fill the gauge faster.**
- **Production** has the same idea, a **harvest burst**: ticks fill a gauge on the main logging / mining card, and when full it fires a bonus harvest across all plots / slots.
- No active input; bursts fire automatically.

### 11.4 Loadout cost

- Every card has a **cost**. Each job's 1 + 3 loadout has a **cost cap** that grows with account level (and can be raised by the skill tree).
- Higher-rarity cards cost more, so strong cards force trade-offs in the supports.

### 11.5 Shared modifier system

Every tunable number (production rate, damage, drop chance, pity threshold, cost cap, offline cap, XP, costs, …) is computed through **one modifier pipeline**. Its inputs are skill trees, owned items, sets, cards and prestige. Balancing therefore means editing data.

- Each modifier has a **target** (the stat), a **kind** (flat add, percent add, multiplier, set), a **source** and an optional **condition** (job, resource, dungeon).
- Fixed order: base → flat → percent (additive within the group) → multipliers → caps / floors. Results are shown in tooltips with a breakdown by source.

### 11.6 Beta content

| Area                | Content                                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tree kinds (3)      | **Oak** (Oak Wood, start), **Ironbark** (Ironwood), **Moonwillow** (Moonwood)                                                                                                                                                 |
| Mines (3)           | **Copper Quarry** (Copper Ore, start), **Iron Deeps** (Iron Ore, unlocked by clearing Dungeon 1), **Crystal Grotto** (Crystal Ore, unlocked by clearing Dungeon 2)                                                            |
| Dungeons (3)        | **Mossy Cellar** (boss Root Warden, drops Moss Sigil and Moss Core), **Ember Crypt** (boss Cinder Lich, drops Ember Sigil and Cinder Core), **Frostspire Vault** (boss Glacier Colossus, drops Frost Sigil and Frost Core)    |
| Special dungeon (1) | **The Glimmer Trial**, a strength test with a fixed target and a score. Drops **Glimmer Dust** (cosmetic upgrades, shape and accent levels) and **Facet Shards** (gem, glow and ambient levels)                               |
| Cards (12)          | See below                                                                                                                                                                                                                     |
| Portals (2)         | **Card Portal** (costs Moss Sigils), **Wardrobe Gate** (costs Ember Sigils). Frost Sigils and the three Cores are used for tier-ups                                                                                           |
| Prestige            | 1 layer, **Ascension**, granting **Starlight**                                                                                                                                                                                |
| Cosmetic sets       | The two existing sets (Gilded Nocturne, Gilded Tradition) plus a new one, **Verdant Reverie** (leaf-green, moss and dew; ambient animation: drifting petals). Plus the existing loose items, and card-exclusives listed below |
| Card-exclusives (3) | Ember Crown (for Dawnblade Regent), **Heartwood Halo** (border, for Moonwood Dryad), **Core Pulse** (finish, for Core Titan)                                                                                                  |
| Achievements (25)   | Listed below                                                                                                                                                                                                                  |

**Cards (12)**: 4 per job, spread over the rarities (3 Common, 3 Rare, 2 Epic, 2 Legendary, 1 Mythic, 1 Exotic; Exotic and Void are mostly cosmetic territory in the beta, Void arrives with later content).

| Job      | Common            | Rare          | Epic / Legendary        | Top                     |
| -------- | ----------------- | ------------- | ----------------------- | ----------------------- |
| Fighting | Ember Squire      | Shield Warden | Storm Duelist (Epic)    | Dawnblade Regent (Leg.) |
| Logging  | Apprentice Feller | Grove Keeper  | Elder Treant (Epic)     | Moonwood Dryad (Mythic) |
| Mining   | Cave Digger       | Gem Cutter    | Geode Golem (Legendary) | Core Titan (Exotic)     |

**Achievements (25)**: First Harvest, First Kill, Lumberjack I / II (wood harvested), Prospector I / II (ore mined), Tree Hugger (all 3 tree kinds), Deep Delver (all 3 mines), Giant Slayer I / II / III (clear each dungeon), Glimmer Seeker (clear the special dungeon), First Summon, Ten Pulls, Pity Breaker (trigger a pity), Silver Lining (first Silver card), Golden Hour (first Gold card), Six Stars (first ★6), Prismatic Dawn (first Prismatic card), Full Loadout (fill a loadout), Dressed Up (equip a full set), Fashionista (own 10 cosmetics), Skilled (first 10 skill points spent), First Ascension, Night Owl (collect 8 h of offline progress). Cosmetic rewards from achievements are an item source.

### 11.7 Target pacing for the beta

Active play with the game left open, in hours of play:

| Milestone                                | Target |
| ---------------------------------------- | ------ |
| First dungeon cleared (Iron Deeps opens) | 0.5 h  |
| First summon                             | 0.75 h |
| First Silver card                        | 1.5 h  |
| Dungeon 2 cleared                        | 3 h    |
| First Gold card                          | 5 h    |
| First ★6                                 | 7 h    |
| First prestige (Ascension)               | 8 h    |
| Dungeon 3 cleared                        | 12 h   |
| Glimmer Trial cleared                    | 15 h   |
| First Prismatic card                     | 25 h   |
| First max-level cosmetic                 | 20 h   |
| Beta content mostly exhausted            | 40 h   |

## 12. Defaults for underspecified points

Points the decisions above leave open. These defaults apply until changed.

1. **Respec cost.** Free for card enhancements; the account tree has a respec that costs a small amount of Starlight, with the first one per prestige free.
2. **Rank for card enhancements.** Silver ★1.
3. **Enhancement point budget.** Grows with rank (a few points per tier) and is about half of the total cost of the card's options.
4. **XP rates.** Tuned in the balance phase so the account level rises quickly early and slowly later.
