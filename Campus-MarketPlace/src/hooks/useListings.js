import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

// Loads listings: everyone else's unsold items (optionally filtered with
// `params`, see FILTER_KEYS) by default, or the caller's own listings,
// including sold ones, with { mine: true }.
//
// `loading` is true until the first response arrives; `refreshing` is true
// while any request is in flight, so pages can keep the previous results on
// screen instead of blanking out on every filter change.
export const useListings = ({ mine = false, params = {} } = {}) => {
    const [listings, setListings] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(true);
    const [error, setError] = useState(null);

    // Only the most recent request may update state: a slow response for an
    // older filter must never overwrite the results for the current one.
    const latest = useRef(0);

    // A string key keeps the effect stable when the caller passes a fresh
    // object with the same contents on every render.
    const paramsKey = JSON.stringify(params);

    const reload = useCallback(async () => {
        const id = ++latest.current;
        setRefreshing(true);
        try {
            const data = await (mine ? api.getMyListings() : api.getListings(JSON.parse(paramsKey)));
            if (id !== latest.current) return; // superseded
            setListings(data);
            setError(null);
        } catch (err) {
            if (id !== latest.current) return;
            setError(err.message);
        } finally {
            if (id === latest.current) {
                setRefreshing(false);
                setLoaded(true);
            }
        }
    }, [mine, paramsKey]);

    useEffect(() => {
        reload();
        return () => {
            latest.current += 1; // drop responses that arrive after a change/unmount
        };
    }, [reload]);

    return { listings, setListings, loading: !loaded, refreshing, error, reload };
};
