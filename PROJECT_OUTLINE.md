# Project Outline

Reference doc for future work sessions. See `CLAUDE.md` for dev commands and the content rule.

## What this is

Web app: enter a US location, see today's tide curve + current tide status. Design inspired by a Threads post (see README).

## Stack

- Frontend: React 19, Vite 7, Tailwind CSS v4, Recharts. Deployed as Azure Static Web App.
- Backend: single Azure Function (`GetTides`), Node, Azure Functions v4 programming model. Deployed as the SWA's managed API.
- No database. No auth. No tests currently.
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
   - Finds nearest station by simple Euclidean lat/lng distance (no great-circle math — fine at this scale, not precise).
   - Pulls today's predictions from NOAA CO-OPS API (`datagetter`), 6-min interval, metric, local station time.
   - Returns `{ name, displayName, address, predictions }`.
5. Frontend derives current reading + today's high/low turning points (`tideUtilities.js`) and renders the chart + status pill.

## Known limitations / open issues (see README for canonical list)

- Bad input silently falls back to Nawiliwili, HI without telling the user.
- Coastal-station-only coverage; inland queries resolve to nearest coast, sometimes far away.
- No real timezone handling — assumes viewer and location share a timezone.
- Resubmitting the same location sticks on "Loading...".

## Things to know before touching code

- `stations.js` is large (~19k lines) and `require`'d whole into the function at cold start; filtering to `tidal: true` happens at module load, not per-request.
- Distance calc in `getClosestStation` is planar, not geodesic — acceptable given NOAA station density but worth remembering if accuracy work comes up.
- Tide direction/turning-point logic in `tideUtilities.js` is a simple 3-point neighbor comparison, not a real extrema/interpolation algorithm — edge points (idx 0 and last) never get a `tideStatus` classification.
- No `staticwebapp.config.json` currently in the repo — routing/rewrite behavior relies on SWA defaults (co-located `functions/` folder as the API).
