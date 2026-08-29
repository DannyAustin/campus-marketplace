import { useState, useEffect } from 'react';

// Returns `value`, but only after it has stopped changing for `delay` ms.
// Used to avoid a request per keystroke on search and price inputs.
export const useDebouncedValue = (value, delay = 300) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
};
