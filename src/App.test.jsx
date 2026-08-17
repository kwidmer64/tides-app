import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

const predictions = [
    { t: '2026-08-16 00:00', v: '1.000' },
    { t: '2026-08-16 06:00', v: '2.000' },
    { t: '2026-08-16 12:00', v: '1.500' },
    { t: '2026-08-16 18:00', v: '0.500' },
    { t: '2026-08-16 23:54', v: '1.200' }
];

function apiResponse(overrides = {}) {
    return {
        name: 'Testville',
        displayName: 'Testville, Test County, Testland',
        address: { city: 'Testville', state: 'Testland' },
        predictions,
        ...overrides
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
});
