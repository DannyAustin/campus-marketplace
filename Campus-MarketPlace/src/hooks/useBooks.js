import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useBooks = (userId = null, includeSold = false) => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = userId 
                    ? await api.getUserBooks(userId)
                    : await api.getAllBooks();
                
                if (!response.ok) throw new Error('Failed to fetch data');
                
                const data = await response.json();
                // Only filter out sold books if includeSold is false
                const filteredBooks = includeSold 
                    ? data || []
                    : (data || []).filter(book => !book.sold);
                
                setBooks(filteredBooks);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [userId, includeSold]);

    return { books, loading, error, setBooks };
};