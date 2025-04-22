import React from 'react';
import { useBooks } from '../hooks/useBooks';
import { useAuthContext } from '../context/AuthContext';
import BookCard from '../components/BookCard';
import { api } from '../services/api';

function HomePage({ searchQuery }) {
    const { userId } = useAuthContext();
    const { books, loading, error } = useBooks();

    const handleAddToCart = async (book) => {
        try {
            console.log('Adding book to cart:', book);
            // Get the correct book ID
            const bookId = book._id || book.id;
            if (!bookId) {
                throw new Error('Invalid book ID');
            }
            if (!userId) {
                throw new Error('User not logged in');
            }

            console.log('Sending to cart:', { userId, bookId });
            const response = await api.addToCart(userId, bookId);
            
            // Log the raw response
            const responseText = await response.text();
            console.log('Add to cart response:', responseText);
            
            if (!response.ok) {
                throw new Error(responseText || 'Failed to add to cart');
            }
            
            alert('Book added to cart successfully!');
        } catch (error) {
            console.error('Add to cart error:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const filteredBooks = books.filter(book => {
        const bookUserId = book.user_id?.$oid || book.user_id;
        return bookUserId !== userId && 
            (!searchQuery || 
                book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                book.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
    });

    if (loading) return <div className="loading">Loading books...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div>
            <h1 className="books-heading">Available items</h1>
            <div className="card-container">
                {filteredBooks.length === 0 ? (
                    <div className="no-books">The market is empty. Its time you sell something!</div>
                ) : (
                    filteredBooks.map(book => (
                        <BookCard
                            key={book.id}
                            book={book}
                            onAction={() => handleAddToCart(book)}
                            actionLabel="Add to Cart"
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default HomePage;