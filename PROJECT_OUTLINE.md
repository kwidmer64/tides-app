# Project Outline

Reference doc for future work sessions. See `CLAUDE.md` for dev commands and the content rule.

## What this is

Web app: enter a US location, see today's tide curve + current tide status. Design inspired by a Threads post (see README).

## Stack

- Frontend: React 19, Vite 7, Tailwind CSS v4, Recharts. Deployed as Azure Static Web App.
- Backend: single Azure Function (`GetTides`), Node, Azure Functions v4 programming model. Deployed as the SWA's managed API.
- No database. No auth. Tests: Vitest for `src/` + Jest for `functions/`, both runnable from root via `npm test` (see `CLAUDE.md`).
- CI/CD: `.github/workflows/azure-static-web-apps-proud-rock-07574100f.yml` — auto-builds and deploys on push to `master` and on PRs (also tears down PR preview envs on close).

## File map

```
src/
  App.jsx            top-level state, data fetch, layout
  LocationForm.jsx    controlled text input + submit button
  TideChart.jsx        Recharts AreaChart of the day's tide curve
  tideUtilities.js     pure functions: formatData, getCurrentTideMeasurement, getDayTideCycle
  testData.js           static sample NOAA prediction payload for local dev
  App.css / index.css   styling (Tailwind)
functions/
  src/functions/GetTides.js   the one HTTP endpoint: geocode -> nearest station -> NOAA predictions
  src/data/stations.js         static list of ~19k NOAA stations (bundled, filtered to tidal=true at runtime)
  host.json, local.settings.json  Functions host config / local secrets (GEO_API_KEY)
```

## Request flow

1. User types a location string, submits `LocationForm`.
2. `App.jsx` sets `location` state -> triggers `useEffect` -> `GET /api/GetTides?location=...`.
3. Locally, Vite proxies `/api` to `http://localhost:7071` (Functions Core Tools). In prod, SWA routes `/api` to the Function app directly.
4. `GetTides.js`:
   - Geocodes via `geocode.maps.co` (needs `GEO_API_KEY` env var / `functions/local.settings.json` locally).
   - Finds nearest station by great-circle (haversine) distance over the tidal station list.
   - Pulls today's predictions from NOAA CO-OPS API (`datagetter`), 6-min interval, metric, local station time.
   - Returns `{ name, displayName, address, predictions }`.
5. Frontend derives current reading + today's high/low turning points (`tideUtilities.js`) and renders the chart + status pill.

## Known limitations / open issues

Canonical list is `README.md`'s "Known Issues & Limitations" — go read it there. This section used to restate it and drifted out of date as the bugs got fixed, so it now only points.

Code-facing shape of it: coverage is NOAA-station-only (inland queries resolve to the nearest coast, sometimes far away), and the frontend derives the current reading from the viewer's clock rather than the queried location's timezone.

## Things to know before touching code

- `stations.js` is large (~19k lines) and `require`'d whole into the function at cold start; filtering to `tidal: true` happens at module load, not per-request.
- `getClosestStation` uses haversine distance, so station selection is correct at any latitude. It still only picks the nearest station — it makes no judgement about whether that station is actually relevant to the query (see the inland-location limitation).
- Tide direction/turning-point logic in `tideUtilities.js` is a simple 3-point neighbor comparison, not a real extrema/interpolation algorithm. First/last points are classified directionally (rising/falling) only — a boundary point can't be verified as a true high/low turning point without a data point from before/after the fetched day.
- No `staticwebapp.config.json` currently in the repo — routing/rewrite behavior relies on SWA defaults (co-located `functions/` folder as the API).

## Deferred improvements (not yet done)

A full line-by-line review surfaced these. The correctness bugs from that review are already fixed (see git history: `fix/tide-app-real-bugs`); these are the remaining items that were explicitly deferred as lower-priority/style rather than broken behavior. Picking any of these up is a reasonable way to start a future session.

**Security / robustness:**
- `functions/src/functions/GetTides.js`'s `GetTides` endpoint has no throttling or auth in front of it — anyone can call `/api/GetTides` directly, bypassing the UI, and burn through the `GEO_API_KEY` quota. **Accepted risk, not fixing for now**: confirmed via Microsoft Learn docs that managed SWA Functions (this app's setup — no `staticwebapp.config.json`, no bring-your-own-functions) aren't independently reachable at a raw Function App URL outside the SWA domain, which narrows the exposure somewhat. A real fix (per-IP/shared-store rate limiting) needs cross-instance state that isn't cheap on a Consumption plan, and this app has effectively no traffic yet — revisit if usage grows or abuse is observed.

**Code quality / standards:**
- No TypeScript or PropTypes anywhere in `src/` — an app this data-shape-heavy (NOAA payload → derived chart data) would benefit from typed boundaries, especially now that there's a test suite pinning current shapes.
