const { app } = require('@azure/functions');

app.http('GetCoords', {
    methods: ['GET'],
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        const queryLocation = request.query.get('location').split(",").map(item => item.trim());
        const apiKey = process.env.GEO_API_KEY;

        if (queryLocation.length !== 2 || !queryLocation) {
            return {
                status: 400,
                headers: {
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({
                    error: `Invalid 'location' query parameter. Location: ${queryLocation}`
                })
            };
        }

        const apiURL = `https://geocode.maps.co/search?city=${queryLocation[0]}&state=${queryLocation[1]}&api_key=${apiKey}`;
        try {
            const res = await fetch(apiURL);
            const jsonResponse = await res.json();
            const displayName = [
                jsonResponse[0].display_name.split(',')[0].trim(),
                jsonResponse[0].display_name.split(',')[2].trim()
            ]
            const responseLocation = {
                location: displayName,
                lat: jsonResponse[0].lat,
                lng: jsonResponse[0].lon
            };

            console.log(jsonResponse);

            return {
                status: 200,
                headers: {
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify(responseLocation)
            };
        } catch (err) {
            return {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: "Failed to contact upstream API",
                    details: err.message
                })
            };
        }
    }
});
