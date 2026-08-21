import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

const predictions = [
    { t: '2026-08-16 00:00', v: '1.000' },
    { t: '2026-08-16 06:00', v: '2.000' },
    { t: '2026-08-16 12:00', v: '1.500' },
    { t: '2026-08-16 18:00', v: '0.500' },
    { t: '2026-08-16 23:54', v: '1.200' }
];

const extremes = [
    { t: '2026-08-16 06:00', v: '2.000', type: 'H' },
    { t: '2026-08-16 18:00', v: '0.500', type: 'L' }
];

function apiResponse(overrides = {}) {
    return {
        name: 'Testville',
        displayName: 'Testville, Test County, Testland',
        address: { city: 'Testville', state: 'Testland' },
        predictions,
        extremes,
        station: { name: 'Test Harbor', distanceKm: 3.2 },
        ...overrides
    };
}

function rejectedResponse() {
    return {
        ok: false,
        status: 404,
        json: async () => ({
            error: 'No tide station near Denver.',
            place: 'Denver',
            nearestStation: { name: 'Newport Bay Entrance, Corona del Mar', distanceKm: 1335.5 }
        })
    };
}

function okJsonResponse(body) {
    return { ok: true, status: 200, json: async () => body };
}

function failedResponse(status = 502) {
    return { ok: false, status, json: async () => ({ error: 'failed' }) };
}

beforeEach(() => {
    // Only fake Date - leave setTimeout alone so Testing Library's async
    // queries (findBy/waitFor), which poll via real timers, keep working.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-16T12:00:00'));
    globalThis.fetch = vi.fn();
});

afterEach(() => {
    vi.useRealTimers();
    delete globalThis.fetch;
});

describe('App', () => {
    test('shows Loading while the initial fetch is in flight', () => {
        globalThis.fetch.mockReturnValue(new Promise(() => {})); // never resolves
        render(<App />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('renders the fetched tide reading and location once loaded', async () => {
        globalThis.fetch.mockResolvedValueOnce(okJsonResponse(apiResponse()));
        render(<App />);

        expect(await screen.findByText('1.50 ft')).toBeInTheDocument();
        expect(screen.getByText('Testville')).toBeInTheDocument();
    });

    test('derives the tide status from the reported extremes', async () => {
        globalThis.fetch.mockResolvedValueOnce(okJsonResponse(apiResponse()));
        render(<App />);

        // noon sits between the 06:00 high and the 18:00 low
        expect(await screen.findByText('Falling tide')).toBeInTheDocument();
    });

    test('explains why a location with no nearby station has no data', async () => {
        globalThis.fetch.mockResolvedValueOnce(rejectedResponse());
        render(<App />);

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(/no tide station near denver/i);
        expect(alert).toHaveTextContent(/newport bay entrance/i);
        // the API reports km; the screen shows miles
        expect(alert).toHaveTextContent(/830 miles away/i);
        expect(alert).not.toHaveTextContent(/km/i);
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    test('falls back to the API message when the rejection has no structured detail', async () => {
        globalThis.fetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({ error: 'No tide station near there.' })
        });
        render(<App />);

        expect(await screen.findByRole('alert')).toHaveTextContent(/no tide station near there/i);
    });

    test('keeps upstream failure detail out of the message for non-404 errors', async () => {
        globalThis.fetch.mockResolvedValueOnce(failedResponse(502));
        render(<App />);

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(/couldn't load tide data/i);
        expect(alert).not.toHaveTextContent(/noaa/i);
    });

    test('shows an inline error instead of hanging when the fetch fails', async () => {
        globalThis.fetch.mockResolvedValueOnce(failedResponse());
        render(<App />);

        expect(await screen.findByText(/couldn't load tide data/i)).toBeInTheDocument();
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    test('submitting a new location triggers a second fetch for that location', async () => {
        const user = userEvent.setup();
        globalThis.fetch.mockResolvedValueOnce(okJsonResponse(apiResponse()));
        render(<App />);

        await screen.findByText('1.50 ft');

        globalThis.fetch.mockResolvedValueOnce(
            okJsonResponse(apiResponse({ name: 'Elsewhere' }))
        );

        await user.type(screen.getByPlaceholderText('Enter location'), 'Elsewhere, ZZ');
        await user.click(screen.getByRole('button', { name: 'Go' }));

        await screen.findByText('Elsewhere');

        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
        const secondCallUrl = globalThis.fetch.mock.calls[1][0];
        expect(secondCallUrl).toContain(encodeURIComponent('Elsewhere, ZZ'));
    });

    test('resubmitting the same location still triggers a second fetch', async () => {
        const user = userEvent.setup();
        globalThis.fetch.mockResolvedValue(okJsonResponse(apiResponse()));
        render(<App />);

        await screen.findByText('1.50 ft');

        // "Surf City, NJ" is the location the app already loaded on mount
        await user.type(screen.getByPlaceholderText('Enter location'), 'Surf City, NJ');
        await user.click(screen.getByRole('button', { name: 'Go' }));

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    });

    test('marks the submit button busy while a resubmit is in flight', async () => {
        const user = userEvent.setup();
        globalThis.fetch.mockResolvedValueOnce(okJsonResponse(apiResponse()));
        render(<App />);

        await screen.findByText('1.50 ft');
        expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('aria-busy', 'false');

        globalThis.fetch.mockReturnValueOnce(new Promise(() => {})); // never resolves
        await user.type(screen.getByPlaceholderText('Enter location'), 'Elsewhere, ZZ');
        await user.click(screen.getByRole('button', { name: 'Go' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('aria-busy', 'true')
        );
    });

    test('surfaces an error when a resubmit fails after data is already on screen', async () => {
        const user = userEvent.setup();
        globalThis.fetch.mockResolvedValueOnce(okJsonResponse(apiResponse()));
        render(<App />);

        await screen.findByText('1.50 ft');

        globalThis.fetch.mockResolvedValueOnce(failedResponse());
        await user.type(screen.getByPlaceholderText('Enter location'), 'Elsewhere, ZZ');
        await user.click(screen.getByRole('button', { name: 'Go' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load tide data/i);
        // the previously loaded reading stays put rather than being blanked out
        expect(screen.getByText('1.50 ft')).toBeInTheDocument();
    });
});
