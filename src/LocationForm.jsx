import {useState} from "react";

const LocationForm = ({ onSubmit, loading = false }) => {
    const [location, setLocation] = useState("");

    const handleSubmit = (event) => {
        event.preventDefault(); // prevent the default page refresh of a form submit
        // the button is aria-disabled rather than disabled, so it stays clickable
        if (loading) return;
        const trimmedLocation = location.trim();
        if (!trimmedLocation) return;
        onSubmit(trimmedLocation);
    }

    const handleChange = (e) => {
        setLocation(e.target.value);
    }

    return (
        <>
            <form className="flex gap-3 w-full" onSubmit={handleSubmit}>
                <input type="text"
                       name="location"
                       value={location}
                       id="location"
                       aria-label="Location"
                       className="w-full border border-gray-400 rounded-md bg-transparent px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                       placeholder="Enter location"
                       onChange={handleChange}
                />
                <button type="submit"
                        aria-busy={loading}
                        aria-disabled={loading}
                        className="grid place-items-center bg-sky-500 py-2 px-3 w-2/12 rounded-md text-zinc-900 transition-all hover:bg-sky-600 hover:cursor-pointer aria-disabled:opacity-50 aria-disabled:hover:bg-sky-500 aria-disabled:hover:cursor-not-allowed"
                >
                    {/*
                      Both children share one grid cell so the button is always as tall as the
                      label's line box, spinner or not. The label stays in flow (and in the
                      accessibility tree, keeping the button's name "Go") and just goes
                      transparent - hiding it any other way would collapse the button's height.
                    */}
                    <span className={`col-start-1 row-start-1 ${loading ? "text-transparent" : ""}`}>Go</span>
                    {loading && (
                        <span aria-hidden="true"
                              className="col-start-1 row-start-1 size-[1em] rounded-full border-2 border-zinc-900/30 border-t-zinc-900 animate-spin motion-reduce:animate-none"
                        />
                    )}
                </button>
            </form>
        </>
    )
}

export default LocationForm;