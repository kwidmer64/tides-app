import './App.css';
import TideChart from "./TideChart.jsx";
import LocationForm from "./LocationForm.jsx";
import {formatData, getCurrentTideMeasurement, getTideStatusAt} from "./tideUtilities.js";
import {useEffect, useMemo, useState} from "react";

function App() {
    const [data, setData] = useState(null);
    const [extremes, setExtremes] = useState(null);
    const [location, setLocation] = useState("Surf City, NJ");
    const [displayLocation, setDisplayLocation] = useState("Surf City, New Jersey");
    const [fullDisplayLocation, setFullDisplayLocation] = useState("");
    const [fetchError, setFetchError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // bumped on every submit so resubmitting an unchanged location still refetches
    const [refetchNonce, setRefetchNonce] = useState(0);

    const now = new Date()
    const time = now.getHours() * 60 + now.getMinutes();
    const formattedTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    // GET request on GetCoords
    // gets the closest station Id
    // then fetches tides
    useEffect(() => {
        const controller = new AbortController();

        // function that returns predictions data
        const fetchTidesData = async () => {
            const predictionsRes = await fetch(`/api/GetTides?location=${encodeURIComponent(location)}`, {
                signal: controller.signal
            });
            if (!predictionsRes.ok) {
                const error = new Error(`GetTides request failed with status: ${predictionsRes.status}`);

                // a 404 means the location simply has no tide station near it, and
                // the API explains which one was nearest and how far - worth showing
                if (predictionsRes.status === 404) {
                    const body = await predictionsRes.json().catch(() => null);
                    error.userMessage = body?.error ?? "No tide station near that location.";
                }

                throw error;
            }
            return await predictionsRes.json();
        }

        setFetchError(null);
        setIsLoading(true);

        fetchTidesData().then(predictionsData => {
            // set the predictions data and display location
            setData(predictionsData.predictions);
            setExtremes(predictionsData.extremes);
            setDisplayLocation(`${predictionsData.name}`);
            // Build formatted full location from structured address
            const address = predictionsData.address;
            if (address) {
                const city = address.city || address.town || address.village || "";
                const state = address.state || "";
                const parts = [predictionsData.name, city, state].filter(Boolean);
                // Remove duplicates (e.g., if name === city)
                const unique = parts.filter((part, i) => parts.indexOf(part) === i);
                setFullDisplayLocation(unique.join(", "));
            } else {
                setFullDisplayLocation(predictionsData.displayName || "");
            }
            setIsLoading(false);
        }).catch(err => {
            // an aborted request has been superseded - the newer one owns the loading state
            if (err.name === 'AbortError') return;
            console.error(err);
            setFetchError(err.userMessage ?? "Couldn't load tide data for that location. Try again.");
            setIsLoading(false);
        });

        return () => controller.abort();
    }, [location, refetchNonce]);

    const { currentTideMeasurement, series, dayExtremes, tideStatus } = useMemo(() => {
        if (!data) return {};

        const series = formatData(data);
        const dayExtremes = formatData(extremes ?? []);
        const currentTideMeasurement = getCurrentTideMeasurement(series, time);

        // judged against NOAA's own turning points rather than neighbouring samples
        const currentTideStatus = getTideStatusAt(time, dayExtremes);

        // set text for the tide status label
        let tideStatusText;
        let tideStatusIndicator;

        switch (currentTideStatus) {
            case 2:
                tideStatusText = "High tide";
                tideStatusIndicator = "↑";
                break;
            case 1:
                tideStatusText = "Rising tide";
                tideStatusIndicator = "↑";
                break;
            case -1:
                tideStatusText = "Falling tide";
                tideStatusIndicator = "↓";
                break;
            case -2:
                tideStatusText = "Low tide";
                tideStatusIndicator = "↓";
                break;
            default:
                tideStatusText = "Tide";
                tideStatusIndicator = "";
        }

        return {currentTideMeasurement, series, dayExtremes, tideStatus: [tideStatusText, tideStatusIndicator]};
    }, [data, extremes, time]);

    if (!currentTideMeasurement || !tideStatus) {
        return (
            <div className={" p-5 bg-zinc-900 text-amber-50 h-full"}>
                {fetchError ? (
                    <h2 role="alert" className={"text-nowrap text-red-400 text-lg me-1"}>{fetchError}</h2>
                ) : (
                    <h2 role="status" className={"text-nowrap text-sky-500 text-lg me-1"}>Loading...</h2>
                )}
            </div>
        )
    }

    const handleFormSubmit = (value) => {
        setLocation(value);
        setRefetchNonce(n => n + 1);
    }

  return (
    <>
      <div className={"p-5 pt-3 bg-zinc-900 text-amber-50 h-full"}>
          {displayLocation && (
              <div className="group flex flex-col items-start justify-evenly h-12 mb-2 cursor-default">
                  <p className="text-nowrap text-neutral-400 text-md">
                      {displayLocation}
                  </p>
                  {fullDisplayLocation && (
                      <p className="text-sm text-neutral-500 hidden group-hover:block">
                          {fullDisplayLocation}
                      </p>
                  )}
              </div>
          )}
          <div className={"flex justify-between mb-4"}>
              <h1 className={"text-4xl"}>{parseFloat(currentTideMeasurement.v).toFixed(2)} ft</h1>
              <div className={"flex items-center gap-2"}>
                  <h2 className={"text-nowrap text-sky-500 text-lg me-1"}>{tideStatus[0]}</h2>
                  <div className={"flex items-center justify-center rounded-full text-xl w-[1.5em] h-[1.5em] bg-blue-500/50 text-sky-500"}>{tideStatus[1]}</div>
              </div>
          </div>
          <div className={"h-40"}>
              <TideChart series={series} extremes={dayExtremes} formattedTime={formattedTime} time={time}/>
          </div>
          <LocationForm onSubmit={handleFormSubmit} loading={isLoading} />
          {/* the early-return error branch above only covers the first load, when there is no data yet */}
          {fetchError && (
              <p role="alert" className={"mt-2 text-sm text-red-400"}>{fetchError}</p>
          )}
          {/*{displayLocation && <p className={"text-zinc-600 mt-2"}>Location</p>}*/}
          {/*{displayLocation && <h2 className={"text-nowrap text-neutral-300 text-lg me-1"}>{displayLocation}</h2>}*/}
      </div>
    </>
  )
}

export default App;