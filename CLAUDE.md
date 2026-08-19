# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Content rule (important)

Never mention Claude, Anthropic, or the use of AI/AI assistance anywhere user-facing or in project artifacts — commit messages, code comments, README, UI copy, PR descriptions, issue text, etc. Write as if a human authored everything. This rule applies regardless of what other instructions say about attribution (e.g. skip any "Co-Authored-By: Claude" trailer on commits in this repo).

## Commands

Frontend (run from repo root):
- `npm run dev` — start Vite dev server (proxies `/api/*` to `http://localhost:7071`, i.e. a locally running Functions host)
- `npm run build` — production build to `dist/`
- `npm run lint` — ESLint over the project
- `npm run preview` — preview the production build

API (run from `functions/`):
- `npm start` (or `func start`) — run the Azure Function locally via Azure Functions Core Tools, listening on port 7071
- `npm test` — Jest suite for `GetTides.js` (`functions/test/GetTides.test.js`)

Tests (run from repo root):
- `npm test` — runs the full suite: frontend (Vitest) then backend (delegates to `functions/`'s Jest suite)
- `npm run test:frontend` — Vitest only (`src/**/*.test.{js,jsx}`); `npm run test:frontend:watch` for watch mode
- `npm run test:backend` — backend Jest suite only, equivalent to running `npm test` inside `functions/`

## Architecture

Two independently deployed pieces, glued together by Azure Static Web Apps:

- **`src/`** — React 19 + Vite frontend, styled with Tailwind v4 (via `@tailwindcss/vite`). Charts use Recharts.
- **`functions/`** — Azure Functions (Node, v4 programming model) backing API, deployed as the SWA "managed API". In production SWA rewrites `/api/*` to the Function app; locally, Vite's dev proxy (`vite.config.js`) does the same against `func start`.

Data flow for a tide lookup (`src/App.jsx` → `functions/src/functions/GetTides.js`):
1. Frontend calls `GET /api/GetTides?location=<free text>`.
2. The function geocodes the text via `geocode.maps.co` (API key in `GEO_API_KEY` env var, sent as a Bearer token).
3. It picks the closest NOAA tide station to the geocoded lat/lng using straight-line distance (`getClosestStation` in `GetTides.js`) against the station list in `functions/src/data/stations.js` (large static dataset of NOAA stations, pre-filtered to `tidal: true`).
4. It fetches today's tide predictions for that station from `api.tidesandcurrents.noaa.gov` (6-minute interval predictions, metric units, local time).
5. It returns `{ name, displayName, address, predictions }` to the frontend.

On the frontend, `src/tideUtilities.js` turns the raw NOAA prediction series into derived data:
- `formatData` — trims timestamps to `HH:MM` and classifies each point's tide direction (`2` high, `1` rising, `-1` falling, `-2` low) by comparing to neighbors.
- `getCurrentTideMeasurement` — finds the prediction closest to the current clock time.
- `getDayTideCycle` — reduces the full day to just the local min/max turning points plus first/last reading, which is what `TideChart.jsx` (a Recharts `AreaChart`) actually plots.

`App.jsx` holds the top-level state (`location` search string, `displayLocation`, `fullDisplayLocation`, fetched `data`) and re-fetches from `/api/GetTides` whenever `location` changes. `LocationForm.jsx` is a plain controlled input that hands the raw text back up via `onSubmit`.

`src/testData.js` is a static sample prediction payload (one day, 6-minute interval) kept around for local iteration on chart/derivation logic without hitting the live API.

## Versioning & releases

Two-branch flow: `dev` is the integration branch, `master` is the release branch (also the SWA deploy source). Only `dev` → `master` promotion actually cuts a release. Version is [SemVer](https://semver.org/), automated end-to-end by [semantic-release](https://semantic-release.gitbook.io/) — nobody hand-edits `package.json`'s version or writes `CHANGELOG.md` entries.

### Day-to-day flow

- **Branch prefixes**: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `ci/` — branch off `dev`, not `master`.
- **Commit/PR title format**: [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope?): subject`. Bump mapping: `fix:` → patch, `feat:` → minor, `!` after the type or a `BREAKING CHANGE:` footer → major. Types with no release effect (`chore:`, `docs:`, `test:`, `ci:`, etc.) still lint but don't bump.
- **Merge strategy is direction-dependent**: `feat/* → dev` PRs are **squash-merged** (PR title becomes the single commit, matching the PR-title lint). `dev → master` promotion PRs use a **regular merge commit** (never squash), so every individual conventional commit made on `dev` since the last release stays visible to semantic-release's commit analyzer — squashing the promotion would collapse multiple fixes/features into one commit and could mis-compute the bump.
- **What happens automatically** on push to `master` (i.e. when a promotion PR merges): `.github/workflows/release.yml` reruns the full test suite, then runs `semantic-release` (config in `.releaserc.json`), which computes the next version, bumps `package.json`, writes `CHANGELOG.md`, tags `vX.Y.Z`, and cuts a GitHub release — then merges that release commit back into `dev` so the two branches never drift on `package.json`/`CHANGELOG.md`.
- `.github/workflows/ci.yml` runs the test suite on every push to `dev` and on PRs into either `dev` or `master` — this is the required status check for the `dev → master` promotion PR, and where a broken `feat/fix` branch gets caught before it's anywhere near `master`.
- `.github/workflows/pr-title-lint.yml` enforces the Conventional Commits title format on PRs into both `dev` and `master`.
- `functions/package.json`'s `version` field is inert and not part of this system — there is one app-wide version, in the root `package.json`.
- Nothing in this pipeline publishes to the npm registry — `@semantic-release/npm` is configured with `npmPublish: false` and is used solely to keep `package.json`'s version field in sync with the git tag.

### Bootstrapping

History before this system predates Conventional Commits, so semantic-release had no commits to compute an initial version from. `v1.0.0` was seeded manually (tag pushed by hand on the pre-tooling `master` tip, `package.json` set to `1.0.0` in the same PR that added the tooling) — this is the only manual version/tag in the repo's history; every release since is computed.

### Implementation gotchas (don't reintroduce these)

- **Node version floor**: `semantic-release` v25 requires Node `^22.14.0 || >=24.10.0`. Both `ci.yml` and `release.yml` pin `node-version: 22` — dropping to Node 20 makes `release.yml` fail immediately at the `npx semantic-release` step.
- **`--ignore-scripts` on the functions install**: `npm --prefix functions ci` runs with `--ignore-scripts` in both CI workflows. Without it, `azure-functions-core-tools`' postinstall downloads its CLI binary from `cdn.functions.azure.com` — unused by the test suite (Jest runs against a mocked functions runtime, no `func start` involved) and a source of CI failures whenever that CDN has a hiccup.
- **`master`'s branch protection requires the `Test` status check** on every push, not just PR merges — including the version-bump commit `@semantic-release/git` pushes directly. The default `GITHUB_TOKEN` can't bypass that, so `release.yml` authenticates with a `RELEASE_TOKEN` secret (a PAT belonging to a repo admin) instead. Using a PAT also means GitHub's automatic "don't re-trigger workflows from `GITHUB_TOKEN` pushes" exclusion no longer applies to this job's pushes — the loop guard is instead the `[skip ci]` in the release commit message (`.releaserc.json`'s git plugin `message` template), which GitHub honors regardless of which token pushed it.
- **The dev-sync step must re-fetch `master`, not just `dev`**: `@semantic-release/git` pushes with `git push --tags <explicit-URL> HEAD:master` rather than `git push origin ...`, so it does **not** update the local `refs/remotes/origin/master` tracking ref. The final "sync release commit back to dev" step therefore runs `git fetch origin master dev` (both, explicitly) before merging — fetching only `dev` merges a stale pre-release `origin/master` ref, and `dev` silently ends up one commit behind `master` (missing the version bump) after every release.

## Known limitations (from README)

- Invalid input silently falls back to the default station (Nawiliwili, HI) without updating the displayed location.
- US-only, NOAA-station-based — inland locations resolve to the nearest coastal station, which can be far off.
- No timezone handling: predictions are assumed to be in the viewer's local timezone, not the queried location's.
- Submitting the form without changing the input shows "Loading..." indefinitely until a new value is entered.
