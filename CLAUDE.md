# Basic Incremental — Project Conventions

Windows desktop incremental game (Electron + TypeScript).

- `docs/DESIGN.md` is the source of truth for game design. Read it before any feature work, and never contradict it without asking the user first.
- Game content (cards, resources, dungeons, cosmetics) lives in data files validated by schemas, not hardcoded in logic.
- Game logic stays separate from UI so it can be unit tested.
- Use `break_eternity.js` for all game numbers.
- Save format changes always need a version bump and a migration.
- Verify changes (build, tests, run) before saying something is done.
