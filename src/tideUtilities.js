function formatData(data) {
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

    return formattedData;
}

// use the reduce function to find the closest data point to the current time
function getCurrentTideMeasurement(data, time) {
    return data.reduce((prevMeasurement, currMeasurement) => {
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
}

// calculates the lowest and highest points for the day, as well as the first and last measurement of the day
function getDayTideCycle(data) {
    let tide = [];
    // get the first element in the data array (this will be closest to 00:00)
    tide.push(data[0]);
    // get the highest and lowest points for the day
    for (let idx = 1; idx < data.length - 1; idx++) {
        const prev = parseFloat(data[idx - 1].v);
        const curr = parseFloat(data[idx].v);
        const next = parseFloat(data[idx + 1].v);

        if (curr > prev && curr >= next) {
            tide.push(data[idx])
        } else if (curr < prev && curr <= next) {
            tide.push(data[idx])
        }
    }
    // get the last element in the data array (this will be closest to 23:59)
    tide.push(data[data.length - 1]);

    return tide;
}

export { formatData, getCurrentTideMeasurement, getDayTideCycle };