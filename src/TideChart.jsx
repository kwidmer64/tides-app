import {
    ResponsiveContainer,
    XAxis,
    ReferenceLine,
    CartesianGrid,
    AreaChart,
    Area, Label
} from 'recharts';

// Create chart element
function TideChart({tideDay, formattedTime, time}) {
    // Takes the fullTide data (highs and lows plus first reading and last reading)
    // calculates minutes as minutes since 12AM for tick display
    const tideData = tideDay.map(data => {
        const [hours, minutes] = data.t.split(":").map(Number);
        return {
            ...data,
            minutes: hours * 60 + minutes, // numeric value as minutes since 12AM
            time: data.t.slice(11, 16) // format to HH:MM
        };
    });

    return(
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart width={600} height={300} data={tideData}>
                <def>
                    <linearGradient id="colorHeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                </def>
                <Area dataKey="v" dot={false} type="monotone" stroke="#0ea5e9" strokeWidth={4} fill="url(#colorHeight)"/>
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
                <ReferenceLine x={`${time}`} stroke="#9a3412" isFront={true} strokeWidth={5}>
                    <Label value={`${formattedTime}`} position="insideBottomLeft" fill="#9a3412"/>
                </ReferenceLine>
                {/*<Tooltip />*/}
            </AreaChart>
        </ResponsiveContainer>
    );
}

export default TideChart;