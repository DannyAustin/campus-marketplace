import React, { useState } from 'react';
import { useBooks } from '../hooks/useBooks';
import { useAuthContext } from '../context/AuthContext';
import BookCard from '../components/BookCard';
import EditBookForm from '../components/EditBookForm';
import { api } from '../services/api';

function UserBooksPage() {
    const { userId } = useAuthContext();
    const { books, loading, error, setBooks } = useBooks(userId);
    const [editingBook, setEditingBook] = useState(null);

    const handleEditSubmit = async (formData) => {
        try {
            const response = await api.updateBook(formData);
            if (!response.ok) throw new Error('Failed to update book');

            const updatedData = await response.json();
            
            setBooks(prevBooks =>
                prevBooks.map(book => 
                    book.id === formData.get('id') 
                        ? { 
                            ...book,
                            title: formData.get('title'),
                            price: formData.get('price'),
                            description: formData.get('description'),
                            // Keep existing image if no new image was uploaded
                            image: updatedData.image || book.image
                        }
                        : book
                )
            );
            setEditingBook(null);
            alert('Book updated successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    if (loading) return <div className="loading">Loading books...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div>
            <h1 className="books-heading">Items you have listed in Marketplace!</h1>
            <div className="card-container">
                {editingBook && (
                    <EditBookForm
                        book={editingBook}
                        onSubmit={handleEditSubmit}
                        onCancel={() => setEditingBook(null)}
                    />
                )}
                {books.length === 0 ? (
                    <div className="no-books">You have not published any items in market.</div>
                ) : (
                    books.map(book => (
                        <BookCard
                            key={book.id}
                            book={book}
                            onAction={() => setEditingBook(book)}
                            actionLabel="Edit"
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default UserBooksPage;