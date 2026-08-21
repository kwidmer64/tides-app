import { describe, test, expect } from 'vitest';
import { formatDistance } from './units.js';

// Distances travel in kilometres so the rest of the app stays unit-agnostic;
// they are converted once, here, on the way to the screen.
describe('formatDistance', () => {
    test('converts kilometres to miles', () => {
        expect(formatDistance(1609.34 / 1000)).toBe('1 mile');
        expect(formatDistance(160.934)).toBe('100 miles');
    });

    test('rounds long distances to whole miles', () => {
        // 1335.5 km, the nearest station to Denver
        expect(formatDistance(1335.5)).toBe('830 miles');
    });

    test('keeps one decimal for short distances, where it still tells you something', () => {
        expect(formatDistance(12.4)).toBe('7.7 miles');
        expect(formatDistance(1.2)).toBe('0.7 miles');
    });

    test('says mile, not miles, for exactly one', () => {
        expect(formatDistance(1.60934)).toBe('1 mile');
    });

    test('handles zero without pluralising wrongly', () => {
        expect(formatDistance(0)).toBe('0 miles');
    });
});
