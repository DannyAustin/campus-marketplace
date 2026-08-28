import React from 'react';
import { useBooks } from '../hooks/useBooks';
import BookCard from '../components/BookCard';
import StatusMessage from '../components/StatusMessage';

function SoldItemsPage() {
    const { books, loading, error } = useBooks({ mine: true });
    const soldBooks = books.filter(book => book.sold);

    if (loading) return <div className="loading">Loading your sold items...</div>;
    if (error) return <StatusMessage type="error">{error}</StatusMessage>;

    return (
        <div className="page-container">
            <h1 className="page-title">Your Sold Items!</h1>
            <div className="card-container">
                {soldBooks.length === 0 ? (
                    <div className="no-books">No items have been sold yet.</div>
                ) : (
                    soldBooks.map(book => (
                        <BookCard key={book.id} book={book} disabled actionLabel="Sold" />
                    ))
                )}
            </div>
        </div>
    );
}

export default SoldItemsPage;
