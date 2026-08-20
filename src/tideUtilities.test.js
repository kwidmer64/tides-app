import { describe, test, expect } from 'vitest';
import {
    formatData,
    getMeasurementAt,
    getCurrentTideMeasurement,
    getTideStatusAt
} from './tideUtilities.js';
import testData from './testData.js';

// a plain semidiurnal day: high, low, high, low
function sampleExtremes() {
    return formatData([
        { t: '2026-01-01 02:00', v: '1.244', type: 'H' },
        { t: '2026-01-01 08:00', v: '0.378', type: 'L' },
        { t: '2026-01-01 14:00', v: '1.467', type: 'H' },
        { t: '2026-01-01 20:00', v: '0.417', type: 'L' }
    ]);
}

const at = (hours, minutes = 0) => hours * 60 + minutes;

describe('formatData', () => {
    test('trims timestamps down to HH:MM', () => {
        const formatted = formatData(testData);
        expect(formatted[0].t).toBe('00:00');
        expect(formatted[1].t).toBe('00:06');
    });

    test('leaves the reading itself untouched', () => {
        const formatted = formatData([{ t: '2026-01-01 00:00', v: '1.234' }]);
        expect(formatted[0].v).toBe('1.234');
    });

    test('carries through the high/low marker so it works on extremes too', () => {
        const formatted = formatData([{ t: '2026-01-01 02:00', v: '1.244', type: 'H' }]);
        expect(formatted[0]).toEqual({ t: '02:00', v: '1.244', type: 'H' });
    });

    test('does not classify readings - that is what the extremes are for', () => {
        const formatted = formatData(testData);
        expect(formatted[1].tideStatus).toBeUndefined();
    });
});

describe('getMeasurementAt', () => {
    test('picks the reading closest to the given time', () => {
        const formatted = formatData(testData);
        // 12:03 is 3 minutes from both 12:00 and 12:06; the earlier one wins the tie
        expect(getMeasurementAt(formatted, at(12, 3)).t).toBe('12:00');
    });

    test('returns an exact match when the time lands on a reading', () => {
        const formatted = formatData(testData);
        expect(getMeasurementAt(formatted, at(12, 6)).t).toBe('12:06');
    });

    test('clamps to the first reading when the time is before the start of the day', () => {
        const formatted = formatData(testData);
        expect(getMeasurementAt(formatted, -60).t).toBe('00:00');
    });

    test('clamps to the last reading when the time is after the end of the day', () => {
        const formatted = formatData(testData);
        expect(getMeasurementAt(formatted, at(30)).t).toBe('23:54');
    });
});

describe('getCurrentTideMeasurement', () => {
    test('still selects the same reading as before the refactor', () => {
        const formatted = formatData(testData);
        expect(getCurrentTideMeasurement(formatted, at(12, 3)).t).toBe('12:00');
    });

    test('agrees with getMeasurementAt, which it delegates to', () => {
        const formatted = formatData(testData);
        const time = at(17, 20);
        expect(getCurrentTideMeasurement(formatted, time)).toEqual(getMeasurementAt(formatted, time));
    });
});

describe('getTideStatusAt', () => {
    test('reports a falling tide between a high and the following low', () => {
        expect(getTideStatusAt(at(5), sampleExtremes())).toBe(-1);
    });

    test('reports a rising tide between a low and the following high', () => {
        expect(getTideStatusAt(at(11), sampleExtremes())).toBe(1);
    });

    test('reports high tide at the moment of a high', () => {
        expect(getTideStatusAt(at(2), sampleExtremes())).toBe(2);
    });

    test('reports low tide at the moment of a low', () => {
        expect(getTideStatusAt(at(8), sampleExtremes())).toBe(-2);
    });

    test('still reports high tide just inside the window either side of the peak', () => {
        expect(getTideStatusAt(at(1, 46), sampleExtremes())).toBe(2);
        expect(getTideStatusAt(at(2, 14), sampleExtremes())).toBe(2);
    });

    test('reverts to a direction just outside the window', () => {
        expect(getTideStatusAt(at(1, 44), sampleExtremes())).toBe(1);
        expect(getTideStatusAt(at(2, 16), sampleExtremes())).toBe(-1);
    });

    test('reads toward the first extreme before the day has any behind it', () => {
        // nothing before 02:00, and the tide is climbing toward it
        expect(getTideStatusAt(at(0, 30), sampleExtremes())).toBe(1);
    });

    test('keeps reading after the last extreme of the day', () => {
        // last extreme is a low at 20:00, so the tide is coming back up
        expect(getTideStatusAt(at(23), sampleExtremes())).toBe(1);
    });

    test('reports no status rather than throwing when a day has no extremes', () => {
        expect(getTideStatusAt(at(12), [])).toBe(0);
    });

    test('works for any time, not just now - the hover feature depends on this', () => {
        const extremes = sampleExtremes();
        const everyHour = Array.from({ length: 24 }, (unused, hour) => getTideStatusAt(at(hour), extremes));

        expect(everyHour).toHaveLength(24);
        expect(everyHour.every(status => [2, 1, -1, -2].includes(status))).toBe(true);
    });
});
