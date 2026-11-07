# Style explorations

Three standalone mockups of the same screen, each designed as a complete cosmetic set (one item per slot). They are not part of the app. Open the `.html` files directly in a browser.

| File | Set | Idea |
| --- | --- | --- |
| `a-flatland.html` | Flatland Ink | Clean flat: solid colour, hard outlines, one hard shadow |
| `b-gilded.html` | Gilded Tradition | Classic trading card: coloured frame, gold name plate, felt table |
| `c-nocturne.html` | Nocturne Frost | Dark minimal: hairlines, quiet type, light only where it matters |

## Slots per set

| Slot | Flatland Ink | Gilded Tradition | Nocturne Frost |
| --- | --- | --- | --- |
| Card border | Ink outline | Crimson and gilt (frame follows the job) | Hairline frost |
| Card finish | Stripe holo | Rainbow foil with sparkle | Thin-film iridescence |
| Attack animation | Pop ring | Gilt slash | Scan beam |
| Tick damage style | Sticker pill | Engraved rise | Ice drift |
| Number style | Rounded heavy | Engraved gold | Light tabular |
| Table background | Dot grid | Green felt | Midnight grid |

Fonts: Bricolage Grotesque (A), Alegreya and Alegreya Sans (B), Instrument Sans (C), loaded from `@fontsource` packages so the mockups work offline.

## Rank layer (shared by all three)

Rank visuals are separate from cosmetics and live in `base.css`.

- Stars take the tier colour. Prismatic stars animate through a rainbow.
- At star 6 the stars get a deeper base colour and a bright sheen that sweeps back and forth across the glyphs only. The sheen is a separate copy of the filled stars on top, so it never fights the prismatic animation underneath.
- Star 6 also adds a faint frame glow in the tier colour (the first, smallest evolution step).
- With `prefers-reduced-motion`, nothing loops: the sheen stays static mid-card and tick numbers stop floating.

## Rebuild and screenshot

```bash
node design/explorations/build.mjs
node design/explorations/shoot.mjs
```

`shoot.mjs` freezes every animation at a fixed frame (attack effects at the hit moment) and writes to `screens/`.

## Follow-up options

- `b2-gilded-options.html`: Gilded Tradition items on three plain tables (ink navy, graphite, light stone) with three font pairings. Chosen font: **Modern sans (Outfit)**.
- `c2-gilded-nocturne.html`: the hybrid. Gilded anatomy (frame tinted by job, name plate, art window, stat box) kept so each layer can carry future cosmetics, with Nocturne surfaces (flat, dark, gold hairlines) and Outfit throughout. The picker switches the table and the gilt amount (Minimal: hairline plate; Medium: flat gold plate and an inner gilt line).

```bash
node design/explorations/shoot-options.mjs c2-gilded-nocturne "navy-minimal=table=navy&ornament=minimal" "navy-medium=table=navy&ornament=medium"
```
