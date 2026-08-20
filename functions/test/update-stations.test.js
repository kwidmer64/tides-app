const fs = require('fs');
const os = require('os');
const path = require('path');

const { toStationRecords, renderModule } = require('../scripts/update-stations.js');

function mdapiStation(overrides = {}) {
    return {
        id: '8531680',
        name: 'Sandy Hook, Fort Hancock',
        state: 'NJ',
        lat: 40.46689987182617,
        lng: -74.0093994140625,
        type: 'R',
        reference_id: '',
        timezonecorr: -5,
        shefcode: 'SDHN4',
        details: { self: 'https://example.invalid/details.json' },
        ...overrides
    };
}

describe('toStationRecords', () => {
    test('keeps reference stations and drops subordinate ones', () => {
        const records = toStationRecords([
            mdapiStation({ id: '8531680', type: 'R' }),
            mdapiStation({ id: '8533862', name: 'North Beach', type: 'S', reference_id: '8531680' })
        ]);

        expect(records.map(r => r.id)).toEqual(['8531680']);
    });

    test('keeps only the fields the lookup needs', () => {
        const [record] = toStationRecords([mdapiStation()]);

        expect(record).toEqual({
            id: '8531680',
            name: 'Sandy Hook, Fort Hancock',
            state: 'NJ',
            lat: 40.4669,
            lng: -74.0094
        });
    });

    test('rounds coordinates to a precision the lookup can actually use', () => {
        // NOAA returns values with more digits than a double holds exactly, which
        // is both false precision and a no-loss-of-precision lint error in the
        // generated file. 5dp is a bit over a metre - far finer than needed to
        // pick the nearest station.
        const [record] = toStationRecords([
            mdapiStation({ lat: 21.30333333333334, lng: -157.8645277777778 })
        ]);

        expect(record.lat).toBe(21.30333);
        expect(record.lng).toBe(-157.86453);
    });

    test('coerces ids to strings so the NOAA URL is built consistently', () => {
        const [record] = toStationRecords([mdapiStation({ id: 8531680 })]);

        expect(record.id).toBe('8531680');
    });

    test('sorts by id so regenerating produces a stable diff', () => {
        const records = toStationRecords([
            mdapiStation({ id: '9414290' }),
            mdapiStation({ id: '8531680' }),
            mdapiStation({ id: '8723214' })
        ]);

        expect(records.map(r => r.id)).toEqual(['8531680', '8723214', '9414290']);
    });

    test('returns an empty list rather than throwing when nothing is a reference station', () => {
        expect(toStationRecords([mdapiStation({ type: 'S' })])).toEqual([]);
    });
});

describe('renderModule', () => {
    test('emits a module the function app can require back in', () => {
        const source = renderModule(toStationRecords([mdapiStation()]));

        // load it the same way GetTides does, rather than eval-ing the string
        const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stations-')), 'stations.js');
        fs.writeFileSync(file, source);
        const loaded = require(file);

        expect(loaded).toHaveLength(1);
        expect(loaded[0].id).toBe('8531680');
        expect(loaded[0].name).toBe('Sandy Hook, Fort Hancock');
    });

    test('records the source and station count so the file explains itself', () => {
        const source = renderModule(toStationRecords([mdapiStation()]));

        expect(source).toContain('tidesandcurrents.noaa.gov');
        expect(source).toMatch(/1 station/);
    });
});
