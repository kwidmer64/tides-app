const { handler, getClosestStation } = require('../src/functions/GetTides.js');

function makeRequest(location) {
    return {
        url: `http://localhost/api/GetTides?location=${encodeURIComponent(location ?? '')}`,
        query: {
            get: (key) => (key === 'location' ? location : undefined)
        }
    };
}

function makeContext() {
    return { log: jest.fn(), error: jest.fn() };
}

function geocodeResponse({ ok = true, status = 200, results = [defaultGeocodeResult()] } = {}) {
    return {
        ok,
        status,
        json: async () => results
    };
}

function defaultGeocodeResult(overrides = {}) {
    return {
        lat: '39.66',
        lon: '-74.16',
        name: 'Surf City',
        display_name: 'Surf City, Ocean County, New Jersey, United States',
        address: { city: 'Surf City', state: 'New Jersey' },
        ...overrides
    };
}

function tidesResponse({ ok = true, status = 200, predictions = defaultPredictions() } = {}) {
    return {
        ok,
        status,
        json: async () => ({ predictions })
    };
}

function defaultPredictions() {
    return [
        { t: '2026-08-16 00:00', v: '1.234' },
        { t: '2026-08-16 00:06', v: '1.250' }
    ];
}

describe('getClosestStation', () => {
    const stations = [
        { id: 'A', lat: 0, lng: 0, name: 'Origin' },
        { id: 'B', lat: 10, lng: 10, name: 'Far' },
        { id: 'C', lat: 1, lng: 1, name: 'Near' }
    ];

    test('picks the nearest of several candidates by lat/lng', () => {
        const closest = getClosestStation({ lat: 0.9, lng: 0.9 }, stations);
        expect(closest.id).toBe('C');
    });

    test('handles a single-station list', () => {
        const closest = getClosestStation({ lat: 50, lng: 50 }, [stations[1]]);
        expect(closest.id).toBe('B');
    });

    test('picks correctly regardless of input ordering', () => {
        const forward = getClosestStation({ lat: 0.9, lng: 0.9 }, stations);
        const reversed = getClosestStation({ lat: 0.9, lng: 0.9 }, [...stations].reverse());
        expect(forward.id).toBe('C');
        expect(reversed.id).toBe('C');
    });
});

describe('GetTides handler', () => {
    beforeEach(() => {
        process.env.GEO_API_KEY = 'test-geo-api-key';
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
        delete global.fetch;
    });

    test('returns 400 and makes no requests when location is missing', async () => {
        const res = await handler(makeRequest(null), makeContext());

        expect(res.status).toBe(400);
        expect(JSON.parse(res.body).error).toMatch(/location/i);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('builds the geocode request with an encoded query and the API key as a bearer token', async () => {
        global.fetch
            .mockResolvedValueOnce(geocodeResponse())
            .mockResolvedValueOnce(tidesResponse());

        await handler(makeRequest('Surf City, NJ'), makeContext());

        const [geocodeUrl, geocodeOptions] = global.fetch.mock.calls[0];
        expect(geocodeUrl).toContain('https://geocode.maps.co/search?q=');
        expect(geocodeUrl).toContain(encodeURIComponent('Surf City, NJ'));
        expect(geocodeUrl).not.toContain('Surf City, NJ&countrycodes');
        expect(geocodeUrl).toContain('countrycodes=us');
        expect(geocodeOptions.headers.Authorization).toBe('Bearer test-geo-api-key');
    });

    test('encodes locations containing special characters like spaces and &', async () => {
        global.fetch
            .mockResolvedValueOnce(geocodeResponse())
            .mockResolvedValueOnce(tidesResponse());

        await handler(makeRequest('Cape May & Wildwood'), makeContext());

        const [geocodeUrl] = global.fetch.mock.calls[0];
        expect(geocodeUrl).toContain(encodeURIComponent('Cape May & Wildwood'));
    });

    test('returns 502 and skips the NOAA call when the geocode request fails', async () => {
        global.fetch.mockResolvedValueOnce(geocodeResponse({ ok: false, status: 500 }));

        const res = await handler(makeRequest('Nowhere'), makeContext());

        expect(res.status).toBe(502);
        expect(JSON.parse(res.body).error).toMatch(/geocode\.maps\.co/);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('returns 404 when the geocode API finds no results', async () => {
        global.fetch.mockResolvedValueOnce(geocodeResponse({ results: [] }));

        const res = await handler(makeRequest('Asdfghjkl'), makeContext());

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body).error).toMatch(/no results/i);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('returns 502 when the NOAA predictions request fails', async () => {
        global.fetch
            .mockResolvedValueOnce(geocodeResponse())
            .mockResolvedValueOnce(tidesResponse({ ok: false, status: 503 }));

        const res = await handler(makeRequest('Surf City, NJ'), makeContext());

        expect(res.status).toBe(502);
        expect(JSON.parse(res.body).error).toMatch(/noaa\.gov/);
    });

    test('builds the NOAA request for the current day, not a fixed/stale date', async () => {
        global.fetch
            .mockResolvedValueOnce(geocodeResponse())
            .mockResolvedValueOnce(tidesResponse());

        await handler(makeRequest('Surf City, NJ'), makeContext());

        const [tidesUrl] = global.fetch.mock.calls[1];
        expect(tidesUrl).toContain('product=predictions');
        expect(tidesUrl).toContain('datum=MLLW');
        expect(tidesUrl).toContain('units=metric');
        expect(tidesUrl).toContain('time_zone=lst_ldt');
        expect(tidesUrl).toContain('date=today');
        expect(tidesUrl).not.toContain('begin_date');
        expect(tidesUrl).not.toContain('end_date');
    });

    test('returns 200 with the assembled name, displayName, address and predictions', async () => {
        const geocodeResult = defaultGeocodeResult({
            name: 'Surf City',
            display_name: 'Surf City, Ocean County, New Jersey, United States',
            address: { city: 'Surf City', state: 'New Jersey' }
        });
        const predictions = defaultPredictions();

        global.fetch
            .mockResolvedValueOnce(geocodeResponse({ results: [geocodeResult] }))
            .mockResolvedValueOnce(tidesResponse({ predictions }));

        const res = await handler(makeRequest('Surf City, NJ'), makeContext());

        expect(res.status).toBe(200);
        expect(res.headers['Content-Type']).toBe('application/json');
        expect(JSON.parse(res.body)).toEqual({
            name: geocodeResult.name,
            displayName: geocodeResult.display_name,
            address: geocodeResult.address,
            predictions
        });
    });
});
