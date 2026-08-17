import { describe, test, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import TideChart from './TideChart.jsx';

const tideDay = [
    { t: '00:00', v: '0.5' },
    { t: '05:24', v: '1.9' },
    { t: '11:36', v: '0.1' },
    { t: '23:54', v: '1.2' }
];

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
        expect(() =>
            render(<TideChart tideDay={tideDay} formattedTime="12:30" time={750} />)
        ).not.toThrow();
    });

    test('renders the gradient fill definition', () => {
        const { container } = render(
            <TideChart tideDay={tideDay} formattedTime="12:30" time={750} />
        );
        expect(container.querySelector('#colorHeight')).toBeTruthy();
    });

    test('renders the "now" reference line label', () => {
        render(<TideChart tideDay={tideDay} formattedTime="12:30" time={750} />);
        expect(screen.getByText('12:30')).toBeInTheDocument();
    });
});
