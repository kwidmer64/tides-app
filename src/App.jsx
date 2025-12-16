import './App.css';
import TideChart from "./TideChart.jsx";
import LocationForm from "./LocationForm.jsx";
import {formatData, getCurrentTideMeasurement, getDayTideCycle} from "./tideUtilities.js";
import {useEffect, useMemo, useState} from "react";

function App({ stations }) {
    const [data, setData] = useState(null);
    const [location, setLocation] = useState("Surf City, NJ");
    const [displayLocation, setDisplayLocation] = useState("Surf City, New Jersey");

    const now = new Date()
    const time = now.getHours() * 60 + now.getMinutes();
    const formattedTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    // GET request on GetCoords
    // gets the closest station Id
    // then fetches tides
    useEffect(() => {
        // function that returns predictions data
        const fetchTidesData = async () => {
            try {
                const predictionsRes = await fetch(`/api/GetTides?location=${encodeURIComponent(location)}`);
                return await predictionsRes.json();


            } catch (err) {
                console.log(err);
            }
        }

        fetchTidesData().then(predictionsData => {
            // set the predictions data and display location
            setData(predictionsData.predictions);
            setDisplayLocation(`${predictionsData.name}`);
        });
    }, [stations, location]);

    const { currentTideMeasurement, tideDay, tideStatus } = useMemo(() => {
        if (!data) return {};

        const formattedData = formatData(data);
        const currentTideMeasurement = getCurrentTideMeasurement(formattedData, time);
        const tideDay = getDayTideCycle(formattedData); // get the highest/lowest tides for the day

        // set text for the tide status label
        let tideStatusText;
        let tideStatusIndicator;

        switch (currentTideMeasurement.tideStatus) {
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
                tideStatusText = `tideStatus: ${currentTideMeasurement.tideStatus}`;
        }

        return {currentTideMeasurement, tideDay, tideStatus: [tideStatusText, tideStatusIndicator]};
    }, [data, time]);

    if (!currentTideMeasurement || !tideStatus) {
        return (
            <div className={" p-5 bg-zinc-900 text-amber-50 h-full"}>
                <h2 className={"text-nowrap text-sky-500 text-lg me-1"}>Loading...</h2>
            </div>
        )
    }

    const handleFormSubmit = (data) => {
        setLocation(data);
        setDisplayLocation("Loading...");
    }

  return (
    <>
      <div className={" p-5 bg-zinc-900 text-amber-50 h-full"}>
          {displayLocation && <p className={"text-nowrap text-neutral-400 text-md mb-2"}>{displayLocation}</p>}
          <div className={"flex justify-between mb-4"}>
              <h1 className={"text-4xl"}>{parseFloat(currentTideMeasurement.v).toFixed(2)} ft</h1>
              <div className={"flex items-center gap-2"}>
                  <h2 className={"text-nowrap text-sky-500 text-lg me-1"}>{tideStatus[0]}</h2>
                  <div className={"flex items-center justify-center rounded-full text-xl w-[1.5em] h-[1.5em] bg-blue-500/50 text-sky-500"}>{tideStatus[1]}</div>
              </div>
          </div>
          <div className={"h-40"}>
              <TideChart tideDay={tideDay} formattedTime={formattedTime} time={time}/>
          </div>
          <LocationForm onSubmit={handleFormSubmit} />
          {/*{displayLocation && <p className={"text-zinc-600 mt-2"}>Location</p>}*/}
          {/*{displayLocation && <h2 className={"text-nowrap text-neutral-300 text-lg me-1"}>{displayLocation}</h2>}*/}
      </div>
    </>
  )
}

export default App;