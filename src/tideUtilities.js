// how close to a turning point still counts as "high tide" rather than a direction.
// Without a window the label would only be true for the single instant NOAA names,
// so nobody would ever see it.
const HIGH_LOW_WINDOW_MINUTES = 15;

// high tide = 2, rising = 1, falling = -1, low tide = -2
const HIGH = 2;
const RISING = 1;
const FALLING = -1;
const LOW = -2;

const toMinutes = (t) => {
    const [hours, minutes] = t.split(':').map(Number);
    return hours * 60 + minutes;
};

// trims NOAA's "YYYY-MM-DD HH:MM" down to "HH:MM", leaving every other field
// alone so this works on the 6-minute series and on the high/low extremes alike
function formatData(data) {
    return data.map((measurement) => ({
        ...measurement,
        t: measurement.t.slice(11, 16)
    }));
}

// the reading nearest a given time. Times outside the day clamp to its ends.
function getMeasurementAt(data, time) {
    return data.reduce((closest, measurement) => (
        Math.abs(toMinutes(measurement.t) - time) < Math.abs(toMinutes(closest.t) - time)
            ? measurement
            : closest
    ));
}

function getCurrentTideMeasurement(data, time) {
    return getMeasurementAt(data, time);
}

// what the tide is doing at a given time, judged against NOAA's own turning
// points rather than against neighbouring samples. Takes an arbitrary time so
// the same call answers "now" and "wherever the pointer is".
function getTideStatusAt(time, extremes) {
    if (!extremes || extremes.length === 0) {
        return 0;
    }

    const points = extremes
        .map((extreme) => ({ minutes: toMinutes(extreme.t), type: extreme.type }))
        .sort((a, b) => a.minutes - b.minutes);

    const nearest = points.reduce((closest, point) => (
        Math.abs(point.minutes - time) < Math.abs(closest.minutes - time) ? point : closest
    ));

    if (Math.abs(nearest.minutes - time) <= HIGH_LOW_WINDOW_MINUTES) {
        return nearest.type === 'H' ? HIGH : LOW;
    }

    // otherwise the tide is travelling toward the next turning point. Past the
    // last one of the day it keeps going the only way it can - away from it.
    const next = points.find((point) => point.minutes > time);
    if (next) {
        return next.type === 'H' ? RISING : FALLING;
    }

    return points[points.length - 1].type === 'H' ? FALLING : RISING;
}

export {
    formatData,
    getMeasurementAt,
    getCurrentTideMeasurement,
    getTideStatusAt,
    HIGH_LOW_WINDOW_MINUTES
};
