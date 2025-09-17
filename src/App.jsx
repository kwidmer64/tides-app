import './App.css';
import TideChart from "./TideChart.jsx";
import LocationForm from "./LocationForm.jsx";
import data from "./testData.js";
import {formatData, getCurrentTideMeasurement, getDayTideCycle} from "./tideUtilities.js";

function App() {
    const now = new Date()
    const time = now.getHours() * 60 + now.getMinutes();
    const formattedTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

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

  return (
    <>
      <div className={" m-5 p-5 bg-zinc-900 text-amber-50 h-full rounded-4xl"}>
          <div className={"flex justify-between mb-4"}>
              <h1 className={"text-4xl"}>{parseFloat(currentTideMeasurement.v).toFixed(2)} ft</h1>
              <div className={"flex items-center gap-2"}>
                  <h2 className={"text-nowrap text-sky-500 text-lg me-1"}>{tideStatusText}</h2>
                  <div className={"flex items-center justify-center rounded-full text-xl w-[1.5em] h-[1.5em] bg-blue-500/50 text-sky-500"}>{tideStatusIndicator}</div>
              </div>
          </div>
          <div className={"h-40"}>
              <TideChart tideDay={tideDay} formattedTime={formattedTime} time={time}/>
          </div>
          <LocationForm />
      </div>
    </>
  )
}

export default App;