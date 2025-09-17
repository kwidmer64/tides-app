import './App.css';
import TideChart from "./TideChart.jsx";
import LocationForm from "./LocationForm.jsx";
import data from "./testData.js";

function App() {
    const now = new Date()
    const time = now.getHours() * 60 + now.getMinutes();
    const formattedTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    // format the data int ocorrect HH:MM format
    const formattedData = data.map((measurement) => {
        return {
            t: measurement.t.slice(11,16),
            v: measurement.v
        }
    });

    // calculate rising/falling tide
    // rising = 1, falling = -1, high tide = 2, low tide = -2
    for (let idx = 1; idx < formattedData.length - 1; idx++) {
        const prev = parseFloat(formattedData[idx - 1].v);
        const curr = parseFloat(formattedData[idx].v);
        const next = parseFloat(formattedData[idx + 1].v);

        let tideStatus = 0;

        if (curr >= prev && curr >= next) {
            tideStatus = 2;
        } else if (curr <= prev && curr <= next) {
            tideStatus = -2;
        } else if (curr > prev) {
            tideStatus = 1;
        } else {
            tideStatus = -1;
        }

        // create new data object with new tide status
        formattedData[idx] = {
            ...formattedData[idx],
            tideStatus: tideStatus
        }
    }

    // use the reduce function to find the closest data point to the current time
    const currentTideMeasurement = formattedData.reduce((prevMeasurement, currMeasurement) => {
        // parse time from current data object into hours and minutes
        const [currDataHours, currDataMinutes] = currMeasurement.t.split(":").map(Number);
        // convert hours and minutes into minutes from 12
        const currDataTime = currDataHours * 60 + currDataMinutes;

        // parse time from previous data object into hours and minutes
        const [prevDataHours, prevDataMinutes] = prevMeasurement.t.split(":").map(Number);
        // convert hours and minutes into minutes from 12
        const prevDataTime = prevDataHours * 60 + prevDataMinutes;

        return Math.abs(currDataTime - time) < Math.abs(prevDataTime - time) ? currMeasurement : prevMeasurement;
    });

    // set text for the tide status label
    let tideStatusText;
    switch (currentTideMeasurement.tideStatus) {
        case 2:
            tideStatusText = "High tide";
            break;
        case 1:
            tideStatusText = "Rising tide";
            break;
        case -1:
            tideStatusText = "Falling tide";
            break;
        case -2:
            tideStatusText = "Low tide";
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
                  <div className={"flex items-center justify-center rounded-full text-xl w-[1.5em] h-[1.5em] bg-blue-500/50 text-sky-500"}>↑</div>
              </div>
          </div>
          <div className={"h-40"}>
              <TideChart data={formattedData} formattedTime={formattedTime} time={time}/>
          </div>
          <LocationForm />

          {/*<div className={"h-40 flex justify-between relative"}>*/}
          {/*    <span className={"h-44/50 border-l-3 rounded-full border-amber-800 absolute z-10"} id={"currTimeLine"}></span>*/}
          {/*    <canvas id={"myCanvas"} className={"absolute w-full h-44/50"}></canvas>*/}
          {/*    <span className={"h-full flex items-end text-zinc-500 grow-8"}>12AM</span>*/}
          {/*    <span className={"h-full flex items-end text-zinc-500 grow-8"}><span className={"h-full mr-1 border-l-2 border-zinc-800"}></span>06AM</span>*/}
          {/*    <span className={"h-full flex items-end text-zinc-500 grow-8"}><span className={"h-full mr-1 border-l-2 border-zinc-800"}></span>12PM</span>*/}
          {/*    <span className={"h-full flex items-end text-zinc-500 grow-8"}><span className={"h-full mr-1 border-l-2 border-zinc-800"}></span>06PM</span>*/}
          {/*</div>*/}
      </div>
    </>
  )
}

export default App;


// OLD CODE

// let time = [0, 0];
//
// useEffect(() => {
//     const canvas = document.getElementById("myCanvas");
//     drawWaves(canvas);
//     mapTimeToPos(canvas.width);
// }, []);

// function mapTimeToPos(width) {
//     const currTimeLine = document.getElementById("currTimeLine");
//     const now = new Date();
//     const hours = now.getHours();
//     const min = now.getMinutes();
//     const pos = ((hours + min / 60) / 24) * width;
//     currTimeLine.style.left = `${pos}px`;
// }

// async function getTidesData() {
//     try {
//         const res = await fetch('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&product=predictions&begin_date=20250912&end_date=20250913&datum=MLLW&units=metric&time_zone=lst_ldt&format=json');
//         const data = await res.json();
//
//         const heights = data.predictions.map(p => parseFloat(p.v));
//         const maxHeight = Math.max(...heights);
//         const minHeight = Math.min(...heights);
//
//         const maxTide = data.predictions.find(p => parseFloat(p.v) === maxHeight);
//         const minTide = data.predictions.find(p => parseFloat(p.v) === minHeight);
//
//         const maxTideTime = maxTide.t.substring(10);
//         time = maxTideTime.split(":");
//
//         console.log(data);
//
//     } catch (err) {
//         console.log(err);
//     }
// }

// function drawWaves(canvas) {
//
//     const ctx = canvas.getContext("2d");
//
//     canvas.width = canvas.clientWidth;
//     canvas.height = canvas.clientHeight;
//
//     const width = canvas.width;
//     const height = canvas.height;
//
//     // Curve parameters
//     const amplitude = height * 0.3; // How high the peaks rise above the bottom
//     const peaks = 2;                 // Number of sine wave peaks
//
//     // Gradient fill
//     const gradient = ctx.createLinearGradient(0, 0, 0, height);
//     gradient.addColorStop(0, "rgba(0, 170, 255, 0.7)");
//     gradient.addColorStop(1, "rgba(0, 170, 255, 0)");
//
//     // Draw filled curve
//     ctx.beginPath();
//     ctx.moveTo(0, height); // start at bottom left
//
//     for (let x = 0; x <= width; x++) {
//         const t = (x / width) * peaks * 2 * Math.PI;
//         const y = height - (Math.sin(t) + 1.05) * amplitude;
//         ctx.lineTo(x, y);
//     }
//
//     ctx.lineTo(width, height); // bottom right
//     ctx.closePath();
//     ctx.fillStyle = gradient;
//     ctx.fill();
//
//     // Draw curve outline
//     ctx.beginPath();
//     for (let x = 0; x <= width; x++) {
//         const t = (x / width) * peaks * 2 * Math.PI;
//         const y = height - (Math.sin(t) + 1.05) * amplitude;
//         if (x === 0) ctx.moveTo(x, y);
//         else ctx.lineTo(x, y);
//     }
//
//     ctx.strokeStyle = "#00AAFF";
//     ctx.lineWidth = 3;
//     ctx.stroke();
// }
