import { describe, test, expect } from 'vitest';
import { formatData, getCurrentTideMeasurement, getDayTideCycle } from './tideUtilities.js';
import testData from './testData.js';

describe('formatData', () => {
    test('trims timestamps down to HH:MM', () => {
        const formatted = formatData(testData);
        expect(formatted[0].t).toBe('00:00');
        expect(formatted[1].t).toBe('00:06');
    });

    test('classifies a rising interior point', () => {
        // 00:00 -> 00:06 -> 00:12 is 0.226 -> 0.247 -> 0.269, strictly increasing
        const formatted = formatData(testData);
        expect(formatted[1].tideStatus).toBe(1);
    });

    test('classifies a falling interior point', () => {
        // late-day values are strictly decreasing around this point
        const formatted = formatData(testData);
        const fallingIdx = formatted.findIndex((point) => point.t === '20:06');
        expect(formatted[fallingIdx].tideStatus).toBe(-1);
    });

    test('classifies a local high tide interior point', () => {
        const points = [
            { t: '2026-01-01 00:00', v: '1.0' },
            { t: '2026-01-01 00:06', v: '2.0' },
            { t: '2026-01-01 00:12', v: '1.5' }
        ];
        const formatted = formatData(points);
        expect(formatted[1].tideStatus).toBe(2);
    });

    test('classifies a local low tide interior point', () => {
        const points = [
            { t: '2026-01-01 00:00', v: '2.0' },
            { t: '2026-01-01 00:06', v: '1.0' },
            { t: '2026-01-01 00:12', v: '1.5' }
        ];
        const formatted = formatData(points);
        expect(formatted[1].tideStatus).toBe(-2);
    });

    test('classifies the first point directionally toward its only neighbor', () => {
        const rising = formatData([
            { t: '2026-01-01 00:00', v: '1.0' },
            { t: '2026-01-01 00:06', v: '2.0' },
            { t: '2026-01-01 00:12', v: '3.0' }
        ]);
        expect(rising[0].tideStatus).toBe(1);

        const falling = formatData([
            { t: '2026-01-01 00:00', v: '3.0' },
            { t: '2026-01-01 00:06', v: '2.0' },
            { t: '2026-01-01 00:12', v: '1.0' }
        ]);
        expect(falling[0].tideStatus).toBe(-1);
    });

    test('classifies the last point directionally toward its only neighbor', () => {
        const rising = formatData([
            { t: '2026-01-01 00:00', v: '1.0' },
            { t: '2026-01-01 00:06', v: '2.0' },
            { t: '2026-01-01 00:12', v: '3.0' }
        ]);
        expect(rising[2].tideStatus).toBe(1);

        const falling = formatData([
            { t: '2026-01-01 00:00', v: '3.0' },
            { t: '2026-01-01 00:06', v: '2.0' },
            { t: '2026-01-01 00:12', v: '1.0' }
        ]);
        expect(falling[2].tideStatus).toBe(-1);
    });
});

describe('getCurrentTideMeasurement', () => {
    test('picks the reading closest to the given time', () => {
        const formatted = formatData(testData);
        // 12:03 is 3 minutes from both 12:00 and 12:06; reduce keeps the earlier tie
        const closest = getCurrentTideMeasurement(formatted, 12 * 60 + 3);
        expect(closest.t).toBe('12:00');
    });

    test('clamps to the first reading when time is before the start of the day', () => {
        const formatted = formatData(testData);
        const closest = getCurrentTideMeasurement(formatted, -60);
        expect(closest.t).toBe('00:00');
    });

    test('clamps to the last reading when time is after the end of the day', () => {
        const formatted = formatData(testData);
        const closest = getCurrentTideMeasurement(formatted, 30 * 60);
        expect(closest.t).toBe('23:54');
    });
});

describe('getDayTideCycle', () => {
    test('includes the first and last readings of the day', () => {
        const formatted = formatData(testData);
        const cycle = getDayTideCycle(formatted);
        expect(cycle[0].t).toBe('00:00');
        expect(cycle[cycle.length - 1].t).toBe('23:54');
    });

    test('finds multiple distinct turning points, not just the single global max/min', () => {
        // two highs of different heights and two lows of different heights
        const points = [
            { t: '2026-01-01 00:00', v: '1.0' },
            { t: '2026-01-01 00:06', v: '3.0' }, // high #1 (lower)
            { t: '2026-01-01 00:12', v: '0.5' }, // low #1 (higher)
            { t: '2026-01-01 00:18', v: '4.0' }, // high #2 (global max)
            { t: '2026-01-01 00:24', v: '0.2' }, // low #2 (global min)
            { t: '2026-01-01 00:30', v: '1.5' }
        ];

        const cycle = getDayTideCycle(points);
        const values = cycle.map((point) => point.v);

        expect(values).toContain('3.0');
        expect(values).toContain('0.5');
        expect(values).toContain('4.0');
        expect(values).toContain('0.2');
    });
});
