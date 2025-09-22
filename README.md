# 🌊 Tides App

A simple and visually appealing app that lets you view tide data for a specific location in an easy-to-read graph!  
This project was inspired by a [design on Threads](https://www.threads.com/@uxdepartment/post/DOFMaisjcDh/media).

---

## ⚠️ Known Issues & Limitations

- **Error handling is limited**  
  - Invalid inputs like `"new york"` may cause the app to crash.  
  - When any invalid input is entered, the app defaults to Nawiliwili, HI, and the displayed location does not change.  

- **Location restrictions**  
  - The app can only display **US tide data**, as it relies on the NOAA Tides & Currents API.  
  - Inland cities (e.g., Denver, CO) will show tides for the closest coastal station.  

- **Input limitations**  
  - Locations must be entered as `'City, State'` (two-letter state abbreviation).  
  - Non-US locations (e.g., `"London, UK"`) may result in errors.
 
- **Display issues**  
  - Pressing `Go` without changing location value will change the displayed location to `Loading...` until a new value is entered
  - Some locations display `City, County` instead of the intended `City, State`
  - THe app assumes the user is in the same time zone as the specified location, which can lead to incorrect data being displayed

---

## ✅ To Do

- Improve error handling and provide user-friendly messages.  
- Restrict inputs to valid US coastal locations only.  
- Prevent inland or non-US locations from being entered.  
