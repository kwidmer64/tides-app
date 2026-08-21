// Distances are carried in kilometres everywhere else - the station lookup, the
// range threshold, the API payload - so that none of that has to change if the
// app ever covers somewhere that does not think in miles. This is the one place
// the conversion happens, on the way to the screen.
const KM_PER_MILE = 1.609344;

// below this, a decimal still tells the reader something useful
const WHOLE_MILES_ABOVE = 10;

function formatDistance(km) {
    const miles = km / KM_PER_MILE;
    const rounded = miles >= WHOLE_MILES_ABOVE
        ? String(Math.round(miles))
        : miles.toFixed(1).replace(/\.0$/, '');

    return `${rounded} ${rounded === '1' ? 'mile' : 'miles'}`;
}

export { formatDistance, KM_PER_MILE };
