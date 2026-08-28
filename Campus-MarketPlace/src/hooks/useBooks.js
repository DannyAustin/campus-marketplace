import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

// Loads listings: everyone else's unsold items by default, or the caller's
// own (including sold ones) with { mine: true }.
export const useBooks = ({ mine = false } = {}) => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setBooks(await (mine ? api.getMyBooks() : api.getBooks()));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [mine]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { books, setBooks, loading, error, reload };
};
