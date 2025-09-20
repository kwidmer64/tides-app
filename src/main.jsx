import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import stationsRaw from './testStationData.js'

const stationsFilter = stationsRaw.filter(station => station.tidal);

const stations = stationsFilter.map(station => {
    return {
        id: station.id,
        lat: station.lat,
        lng: station.lng,
        state: station.state,
        name: station.name
    }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App stations={stations} />
  </StrictMode>,
)
