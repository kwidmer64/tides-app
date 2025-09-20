import {useState} from "react";

const LocationForm = ({ onSubmit }) => {
    const [location, setLocation] = useState(null);

    const handleSubmit = (event) => {
        event.preventDefault(); // prevent the default page refresh of a form submit
        onSubmit(location);
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
                       className="peer w-full border border-gray-400 rounded-md bg-transparent px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                       placeholder="Enter location"
                       onChange={handleChange}
                />
                <button type="submit" className="bg-sky-500 py-2 px-3 w-1/12 rounded-md text-zinc-900 transition-all hover:bg-sky-600 hover:cursor-pointer">Go</button>
                {/*<label htmlFor="location" className="absolute left-3 top-2 text-gray-500 text-sm">*/}
                {/*    Location*/}
                {/*</label>*/}
            </form>
        </>
    )
}

export default LocationForm;