import './App.css';
import TideChart from "./TideChart.jsx";
import LocationForm from "./LocationForm.jsx";
import {formatData, getClosestStation, getCurrentTideMeasurement, getDayTideCycle} from "./tideUtilities.js";
import {useEffect, useMemo, useState} from "react";

function App({ stations }) {
    const [data, setData] = useState(null);
    const [location, setLocation] = useState("Surf City, NJ");

    const now = new Date()
    const time = now.getHours() * 60 + now.getMinutes();
    const formattedTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    const formattedDate = `${now.getFullYear()}${String((now.getMonth() + 1)).padStart(2, "0")}${now.getDate()}`;

    useEffect(() => {
        const fetchTidesData = async () => {
            try {
                const url = `/api/GetCoords?location=${location}`;
                const res = await fetch(url);
                const jsonResponse = await res.json();
                const closestStationId = getClosestStation(stations, {lat: jsonResponse.lat, lng: jsonResponse.lng}).id;

                const tidesUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${closestStationId}&product=predictions&begin_date=${formattedDate}&end_date=${formattedDate}&datum=MLLW&units=metric&time_zone=lst_ldt&format=json`;
                const tidesRes = await fetch(tidesUrl);
                const tidesJson = await tidesRes.json();
                const responseData = tidesJson.predictions;

                setData(responseData);

                console.log(closestStationId);
                console.log(responseData);
            } catch (err) {
                console.log(err);
            }
        }

        fetchTidesData();
    }, [stations, formattedDate, location]);

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
            <div className={" m-5 p-5 bg-zinc-900 text-amber-50 h-full rounded-4xl"}>
                <h2 className={"text-nowrap text-sky-500 text-lg me-1"}>Loading...</h2>
            </div>
        )
    }

    const handleFormSubmit = (data) => {
        setLocation(data);
    }

  return (
    <>
      <div className={" m-5 p-5 bg-zinc-900 text-amber-50 h-full rounded-4xl"}>
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
          {location && <h2 className={"text-nowrap text-sky-500 text-lg me-1"}>{location}</h2>}
      </div>
    </>
  )
}

export default App;