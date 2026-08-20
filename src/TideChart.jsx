import {
    ResponsiveContainer,
    XAxis,
    ReferenceLine,
    ReferenceDot,
    CartesianGrid,
    AreaChart,
    Area, Label
} from 'recharts';

const toMinutes = (t) => {
    const [hours, minutes] = t.split(":").map(Number);
    return hours * 60 + minutes;
};

// Create chart element
function TideChart({series, extremes, formattedTime, time}) {
    // the curve is the full prediction series, so every point on it is measured
    // rather than interpolated between turning points
    const tideData = series.map(measurement => ({
        ...measurement,
        minutes: toMinutes(measurement.t),
        v: Number(measurement.v)
    }));

    return(
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart width={600} height={300} data={tideData}>
                <defs>
                    <linearGradient id="colorHeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <Area dataKey="v" dot={false} type="monotone" stroke="#0ea5e9" strokeWidth={4} fill="url(#colorHeight)" baseValue="dataMin"/>
                <XAxis
                    type="number"
                    dataKey="minutes"
                    domain={[0, 1440]}
                    tickFormatter={min => {
                        const hour = String(Math.floor(min / 60)).padStart(2, "0");
                        const minute = String(min % 60).padStart(2, "0");
                        return `${hour}:${minute}`;
                    }}
                    ticks={[0, 360, 720, 1080]}
                    interval={0}
                    tick={{ textAnchor: "start" }}
                    tickLine={false}
                    axisLine={false}
                />
                <CartesianGrid vertical={true} horizontal={false} />
                {/* NOAA's own turning points, which fall between samples rather than on them */}
                {extremes.map(extreme => (
                    <ReferenceDot
                        key={`${extreme.t}-${extreme.type}`}
                        x={toMinutes(extreme.t)}
                        y={Number(extreme.v)}
                        r={4}
                        fill="#0ea5e9"
                        stroke="#18181b"
                        strokeWidth={2}
                        isFront={true}
                    >
                        <Label
                            value={Number(extreme.v).toFixed(2)}
                            position={extreme.type === 'H' ? 'top' : 'bottom'}
                            fill="#a1a1aa"
                            fontSize={12}
                        />
                    </ReferenceDot>
                ))}
                <ReferenceLine x={time} stroke="#9a3412" isFront={true} strokeWidth={5}>
                    <Label value={`${formattedTime}`} position="insideBottomLeft" fill="#9a3412"/>
                </ReferenceLine>
            </AreaChart>
        </ResponsiveContainer>
    );
}

export default TideChart;
