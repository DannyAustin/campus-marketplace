import React from 'react';
import { useBooks } from '../hooks/useBooks';
import { useAuthContext } from '../context/AuthContext';
import BookCard from '../components/BookCard';

function NotificationsPage({ setNotificationCount }) {
    const { userId } = useAuthContext();
    const { books, loading, error } = useBooks(userId, true); // Added includeSold parameter
    const soldBooks = books.filter(book => book.sold === true);

    React.useEffect(() => {
        setNotificationCount(soldBooks.length);
    }, [soldBooks.length, setNotificationCount]);

    if (loading) return <div className="loading">Loading books...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page-container">
            <h1 className="page-title">Your Sold Items!</h1>
            <div className="card-container">
                {soldBooks.length === 0 ? (
                    <div className="no-books">No items have been sold yet.</div>
                ) : (
                    soldBooks.map(book => (
                        <BookCard
                            key={book._id || book.id}
                            book={book}
                            disabled={true}
                            actionLabel="Sold"
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default NotificationsPage;