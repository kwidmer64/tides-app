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

function defaultExtremes() {
    return [
        { t: '2026-08-16 02:01', v: '1.244', type: 'H' },
        { t: '2026-08-16 08:02', v: '0.378', type: 'L' }
    ];
}

// Denver - nearest reference station is roughly 1335 km away
function inlandGeocodeResult() {
    return defaultGeocodeResult({
        lat: '39.7392',
        lon: '-104.9903',
        name: 'Denver',
        display_name: 'Denver, Colorado, United States',
        address: { city: 'Denver', state: 'Colorado' }
    });
}

// the handler makes two prediction calls: the 6-minute series, then hilo
function mockBothPredictionCalls() {
    global.fetch
        .mockResolvedValueOnce(geocodeResponse())
        .mockResolvedValueOnce(tidesResponse())
        .mockResolvedValueOnce(tidesResponse({ predictions: defaultExtremes() }));
}

describe('getClosestStation', () => {
    const stations = [
        { id: 'A', lat: 0, lng: 0, name: 'Origin' },
        { id: 'B', lat: 10, lng: 10, name: 'Far' },
        { id: 'C', lat: 1, lng: 1, name: 'Near' }
    ];

    test('picks the nearest of several candidates by lat/lng', () => {
        const { station } = getClosestStation({ lat: 0.9, lng: 0.9 }, stations);
        expect(station.id).toBe('C');
    });

    test('handles a single-station list', () => {
        const { station } = getClosestStation({ lat: 50, lng: 50 }, [stations[1]]);
        expect(station.id).toBe('B');
    });

    test('picks correctly regardless of input ordering', () => {
        const forward = getClosestStation({ lat: 0.9, lng: 0.9 }, stations);
        const reversed = getClosestStation({ lat: 0.9, lng: 0.9 }, [...stations].reverse());
        expect(forward.station.id).toBe('C');
        expect(reversed.station.id).toBe('C');
    });

    test('reports how far away the chosen station is, in km', () => {
        // one degree of latitude is about 111 km
        const { distance } = getClosestStation({ lat: 0, lng: 0 }, [{ id: 'A', lat: 1, lng: 0 }]);
        expect(distance).toBeCloseTo(111.19, 1);
    });

    test('measures real distance, not raw degrees, at high latitude', () => {
        // at 60 degrees north a degree of longitude covers about half the ground
        // a degree of latitude does, so the closer station is the one more degrees away
        const highLatStations = [
            { id: 'EAST', lat: 60, lng: 1.8 },  // ~100 km away, but 1.8 degrees
            { id: 'NORTH', lat: 61.5, lng: 0 }  // ~167 km away, but only 1.5 degrees
        ];

        const { station } = getClosestStation({ lat: 60, lng: 0 }, highLatStations);

        expect(station.id).toBe('EAST');
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
        mockBothPredictionCalls();

        await handler(makeRequest('Surf City, NJ'), makeContext());

        const [geocodeUrl, geocodeOptions] = global.fetch.mock.calls[0];
        expect(geocodeUrl).toContain('https://geocode.maps.co/search?q=');
        expect(geocodeUrl).toContain(encodeURIComponent('Surf City, NJ'));
        expect(geocodeUrl).not.toContain('Surf City, NJ&countrycodes');
        expect(geocodeUrl).toContain('countrycodes=us');
        expect(geocodeOptions.headers.Authorization).toBe('Bearer test-geo-api-key');
    });

    test('encodes locations containing special characters like spaces and &', async () => {
        mockBothPredictionCalls();

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
        mockBothPredictionCalls();

        await handler(makeRequest('Surf City, NJ'), makeContext());

        const [tidesUrl] = global.fetch.mock.calls[1];
        expect(tidesUrl).toContain('product=predictions');
        expect(tidesUrl).toContain('datum=MLLW');
        // the app labels heights in feet, so ask NOAA for feet rather than
        // converting - it is a US-only app
        expect(tidesUrl).toContain('units=english');
        expect(tidesUrl).toContain('time_zone=lst_ldt');
        expect(tidesUrl).toContain('date=today');
        expect(tidesUrl).not.toContain('begin_date');
        expect(tidesUrl).not.toContain('end_date');
    });

    test('requests the 6-minute series and the high/low product for the same station', async () => {
        mockBothPredictionCalls();

        await handler(makeRequest('Surf City, NJ'), makeContext());

        expect(global.fetch).toHaveBeenCalledTimes(3);
        const [seriesUrl] = global.fetch.mock.calls[1];
        const [hiloUrl] = global.fetch.mock.calls[2];

        expect(seriesUrl).not.toContain('interval=');
        expect(hiloUrl).toContain('interval=hilo');

        const stationOf = url => new URL(url).searchParams.get('station');
        expect(stationOf(hiloUrl)).toBe(stationOf(seriesUrl));
    });

    test('returns 200 with the assembled name, displayName, address and predictions', async () => {
        const geocodeResult = defaultGeocodeResult({
            name: 'Surf City',
            display_name: 'Surf City, Ocean County, New Jersey, United States',
            address: { city: 'Surf City', state: 'New Jersey' }
        });
        const predictions = defaultPredictions();

        const extremes = defaultExtremes();

        global.fetch
            .mockResolvedValueOnce(geocodeResponse({ results: [geocodeResult] }))
            .mockResolvedValueOnce(tidesResponse({ predictions }))
            .mockResolvedValueOnce(tidesResponse({ predictions: extremes }));

        const res = await handler(makeRequest('Surf City, NJ'), makeContext());

        expect(res.status).toBe(200);
        expect(res.headers['Content-Type']).toBe('application/json');

        const body = JSON.parse(res.body);
        expect(body).toMatchObject({
            name: geocodeResult.name,
            displayName: geocodeResult.display_name,
            address: geocodeResult.address,
            predictions,
            extremes
        });
        expect(body.station.name).toEqual(expect.any(String));
        expect(body.station.distanceKm).toBeLessThan(100);
    });

    test('returns 502 when the high/low request fails even though the series succeeded', async () => {
        global.fetch
            .mockResolvedValueOnce(geocodeResponse())
            .mockResolvedValueOnce(tidesResponse())
            .mockResolvedValueOnce(tidesResponse({ ok: false, status: 503 }));

        const res = await handler(makeRequest('Surf City, NJ'), makeContext());

        expect(res.status).toBe(502);
        expect(JSON.parse(res.body).error).toMatch(/noaa\.gov/);
    });
});

describe('GetTides coastal restriction', () => {
    beforeEach(() => {
        process.env.GEO_API_KEY = 'test-geo-api-key';
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
        delete global.fetch;
    });

    test('refuses a location with no tide station within range', async () => {
        global.fetch.mockResolvedValueOnce(geocodeResponse({ results: [inlandGeocodeResult()] }));

        const res = await handler(makeRequest('Denver, CO'), makeContext());

        expect(res.status).toBe(404);
        expect(JSON.parse(res.body).error).toMatch(/no tide station/i);
    });

    test('names the nearest station and its distance so the message can explain itself', async () => {
        global.fetch.mockResolvedValueOnce(geocodeResponse({ results: [inlandGeocodeResult()] }));

        const res = await handler(makeRequest('Denver, CO'), makeContext());
        const { nearestStation } = JSON.parse(res.body);

        expect(nearestStation.name).toEqual(expect.any(String));
        expect(nearestStation.distanceKm).toBeGreaterThan(1000);
        // display data - one decimal place, not raw float precision
        expect(String(nearestStation.distanceKm)).toMatch(/^\d+(\.\d)?$/);
    });

    test('makes no NOAA request when the location is out of range', async () => {
        global.fetch.mockResolvedValueOnce(geocodeResponse({ results: [inlandGeocodeResult()] }));

        await handler(makeRequest('Denver, CO'), makeContext());

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('allows a coastal location through to the NOAA calls', async () => {
        mockBothPredictionCalls();

        const res = await handler(makeRequest('Surf City, NJ'), makeContext());

        expect(res.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });
});
