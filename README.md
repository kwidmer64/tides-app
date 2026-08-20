# 🌊 Tides App

A simple and visually appealing app that lets you view tide data for a specific location in an easy-to-read graph!  
This project was inspired by a [design on Threads](https://www.threads.com/@uxdepartment/post/DOFMaisjcDh/media).

---

## ⚠️ Known Issues & Limitations

- **Location restrictions**  
  - The app can only display **US tide data**, as it relies on the NOAA Tides & Currents API.  
  - Inland cities (e.g., Denver, CO) will show tides for the closest coastal station, which can be far off.

- **Display issues**  
  - Tide predictions are fetched for the queried location's correct local day, but the frontend still assumes the viewer's own clock matches that location's timezone when determining the current tide status shown on screen.

Invalid or empty input, and failed data fetches, now show an inline error message instead of hanging or silently falling back to a default location.

---

## 🧪 Testing

- `npm test` (repo root) — runs the full suite: frontend (Vitest) then backend (Jest).
- `npm run test:frontend` / `npm run test:backend` — run either suite on its own.

---

## ✅ To Do

- Add a list of hourly tide heights and statuses below the chart.
- Add the ability to drag over the chart to see the height and status at any point in the day.
- Improve the accuracy of tide readings.
- Restrict location input to coastal locations/areas that actually have tide data.
- Add support for international locations (would need a non-NOAA data source).
