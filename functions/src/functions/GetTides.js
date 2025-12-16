const { app } = require('@azure/functions');
const stationsRaw = require('../data/stations.js');

const stationsFilter = stationsRaw.filter(station => station.tidal);
const stations = stationsFilter.map(station => {
    return {
        id: station.id,
        lat: station.lat,
        lng: station.lng,
        state: station.state,
        name: station.name
    }
});

// get and format date for NOAA API
const now = new Date()
const formattedDate = `${now.getFullYear()}${String((now.getMonth() + 1)).padStart(2, "0")}${String((now.getDate())).padStart(2, "0")}`;

// this endpoint should be hit by GetCoords
app.http('GetTides', {
    methods: ['GET'],
    handler: async (request, context) => {
        context.log(`Processing http function request for url "${request.url}"`);
        // get locaton from query parameter
        const queryLocation = request.query.get('location');

        const apiKey = process.env.GEO_API_KEY;

        // if query location is a falsey value
        if (!queryLocation) {
            context.log(`Query parameter 'location' is null. Received: ${queryLocation}`);
            return {
                status: 400,
                headers: {
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({
                    error: `Query parameter 'location' is null.`
                })
            };
        }

        let geocodeData;

        // fetch the geocode api
        try {
            const geocodeApiUrl = `https://geocode.maps.co/search?q=${queryLocation}&countrycodes=us`;
            const geocodeRes =  await fetch(geocodeApiUrl, {
                headers: {
                    'Authorization': `Bearer ${apiKey}` // add API key in the headers for security
                }
            });

            // throw an error if there is a bad response
            if (!geocodeRes.ok) {
                throw new Error(`API responded with status: ${geocodeRes.status}`);
            }

            geocodeData = await geocodeRes.json();
            geocodeData = geocodeData[0];

            // if data is null or empty return 404
            if (!geocodeData || geocodeData.length === 0) {
                return {
                    status: 404,
                    headers: {
                        'Content-Type' : 'application/json'
                    },
                    body: JSON.stringify({
                        error: 'No results found'
                    })
                };
            }
        } catch (err) {
            return {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: "Failed to fetch from geocode.maps.co",
                    details: err.message
                })
            };
        }

        // fetch the NOAA tides api
        try {
            const closestStationId = getClosestStation({lat: geocodeData.lat, lng: geocodeData.lon}).id;

            const tidesApiUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${closestStationId}&product=predictions&begin_date=${formattedDate}&end_date=${formattedDate}&datum=MLLW&units=metric&time_zone=lst_ldt&format=json`;
            const tidesRes = await fetch(tidesApiUrl);
            const tidesData = await tidesRes.json();

            // create response object
            const responseJson = {
                name: geocodeData.name,
                displayName: geocodeData.display_name,
                predictions: tidesData.predictions,
            };

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify(responseJson)
            }
        } catch (err) {
            return {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: "Failed to fetch from tides.noaa.gov",
                    details: err.message
                })
            };
        }
    }
});

// function to calculate the closest station to the input coordinates
function getClosestStation(coords) {
    function calcDistance(lat1, lon1, lat2, lon2) {
        return Math.sqrt((lat2 - lat1)**2 + (lon2 - lon1)**2);
    }

    return stations.reduce((prev, curr) => {
        const currDistance = calcDistance(coords.lat, coords.lng, curr.lat, curr.lng);
        const prevDistance = calcDistance(coords.lat, coords.lng, prev.lat, prev.lng);

        if (currDistance < prevDistance) {
            return curr;
        } else {
            return prev
        }
    });
}