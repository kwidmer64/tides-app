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

## Known limitations (from README)

- Invalid input silently falls back to the default station (Nawiliwili, HI) without updating the displayed location.
- US-only, NOAA-station-based — inland locations resolve to the nearest coastal station, which can be far off.
- No timezone handling: predictions are assumed to be in the viewer's local timezone, not the queried location's.
- Submitting the form without changing the input shows "Loading..." indefinitely until a new value is entered.
