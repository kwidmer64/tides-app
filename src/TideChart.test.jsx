import { describe, test, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import TideChart from './TideChart.jsx';

// a quarter-hourly stand-in for the 6-minute series: enough points that
// "plotted the whole series" and "plotted only the turning points" differ
const series = Array.from({ length: 24 }, (unused, hour) => ({
    t: `${String(hour).padStart(2, '0')}:00`,
    v: (1 + Math.sin((hour / 24) * 2 * Math.PI)).toFixed(3)
}));

const extremes = [
    { t: '05:24', v: '1.900', type: 'H' },
    { t: '11:36', v: '0.100', type: 'L' }
];

const renderChart = (props = {}) => render(
    <TideChart series={series} extremes={extremes} formattedTime="12:30" time={750} {...props} />
);

beforeAll(() => {
    // Recharts' ResponsiveContainer sizes itself from getBoundingClientRect();
    // jsdom reports all-zero rects by default, which makes it render nothing.
    Element.prototype.getBoundingClientRect = () => ({
        width: 600,
        height: 300,
        top: 0,
        left: 0,
        bottom: 300,
        right: 600,
        x: 0,
        y: 0,
        toJSON() {}
    });
});

describe('TideChart', () => {
    test('mounts without throwing given a day of tide data', () => {
        expect(() => renderChart()).not.toThrow();
    });

    test('renders the gradient fill definition', () => {
        const { container } = renderChart();
        expect(container.querySelector('#colorHeight')).toBeTruthy();
    });

    test('renders the "now" reference line label', () => {
        renderChart();
        expect(screen.getByText('12:30')).toBeInTheDocument();
    });

    test('plots the whole series rather than only the turning points', () => {
        const { container } = renderChart();
        const curve = container.querySelector('.recharts-area-curve');

        // one curve segment per gap between points; two extremes could never
        // produce this many
        const segments = (curve.getAttribute('d').match(/C/g) || []).length;
        expect(segments).toBeGreaterThanOrEqual(series.length - 1);
    });

    test('marks each extreme on the curve', () => {
        const { container } = renderChart();
        expect(container.querySelectorAll('.recharts-reference-dot-dot')).toHaveLength(extremes.length);
    });

    test('labels each extreme with the height NOAA predicted for it', () => {
        renderChart();
        expect(screen.getByText('1.90')).toBeInTheDocument();
        expect(screen.getByText('0.10')).toBeInTheDocument();
    });

    test('survives a day with no extremes reported', () => {
        expect(() => renderChart({ extremes: [] })).not.toThrow();
    });
});
