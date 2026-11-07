# Basic Incremental — Project Conventions

Windows desktop incremental game (Electron + TypeScript).

- `docs/DESIGN.md` is the source of truth for game design. Read it before any feature work, and never contradict it without asking the user first.
- Game content (cards, resources, dungeons, cosmetics) lives in data files validated by schemas, not hardcoded in logic.
- Game logic stays separate from UI so it can be unit tested.
- Use `break_eternity.js` for all game numbers.
- Save format changes always need a version bump and a migration.
- Verify changes (build, tests, run) before saying something is done.

## GitHub workflow

Claude handles everything GitHub-related (git + the `gh` CLI); the user does not push, merge or manage PRs manually.

- Work on a new branch named after the task (e.g. `feat/save-system`, `fix/offline-cap`). Never push directly to `main`.
- Commit in small, clear steps with descriptive messages.
- When done, open a PR with a short summary of what changed and how it was verified.
- Wait for CI to pass. If it fails, fix it and push again.
- When CI is green, squash-merge the PR into `main` (the branch is deleted automatically), then switch back to an updated `main`.
- Never force-push, never delete `main`, never merge with failing CI.
- Releases: when the user says "release", bump the version (patch by default, or as specified), merge that via PR, then create and push the `vX.Y.Z` tag so the release workflow publishes it. Confirm when the GitHub Release is live. See `RELEASING.md`.
- At the end of each task, tell the user in one or two lines what was merged.
- Repo settings already applied: Actions workflows have read/write permissions, squash merge is the only merge method, merged branches are deleted automatically. `.claude/settings.json` allows `git`/`gh` commands and denies force-pushes and deleting `main`.
