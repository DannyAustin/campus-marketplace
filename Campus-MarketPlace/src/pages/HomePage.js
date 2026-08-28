import React, { useState } from 'react';
import { useBooks } from '../hooks/useBooks';
import BookCard from '../components/BookCard';
import StatusMessage from '../components/StatusMessage';
import { api } from '../services/api';

function HomePage({ searchQuery }) {
    const { books, loading, error } = useBooks();
    const [status, setStatus] = useState(null);
    const [pendingId, setPendingId] = useState(null);

    const handleAddToCart = async (book) => {
        if (pendingId) return; // one request at a time
        setPendingId(book.id);
        setStatus(null);
        try {
            await api.addToCart(book.id);
            setStatus({ type: 'success', text: `"${book.title}" was added to your cart.` });
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
        } finally {
            setPendingId(null);
        }
    };

    const query = (searchQuery || '').trim().toLowerCase();
    const filteredBooks = query
        ? books.filter(book =>
            book.title.toLowerCase().includes(query) ||
            (book.description || '').toLowerCase().includes(query))
        : books;

    if (loading) return <div className="loading">Loading items...</div>;
    if (error) return <StatusMessage type="error">{error}</StatusMessage>;

    return (
        <div>
            <h1 className="books-heading">Available items</h1>
            <StatusMessage type={status?.type}>{status?.text}</StatusMessage>
            <div className="card-container">
                {filteredBooks.length === 0 ? (
                    <div className="no-books">
                        {query ? 'Nothing matches your search.' : "The market is empty. It's time you sell something!"}
                    </div>
                ) : (
                    filteredBooks.map(book => (
                        <BookCard
                            key={book.id}
                            book={book}
                            onAction={handleAddToCart}
                            actionLabel={pendingId === book.id ? 'Adding…' : 'Add to Cart'}
                            busy={pendingId === book.id}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default HomePage;
