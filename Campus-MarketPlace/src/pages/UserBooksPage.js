import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooks } from '../hooks/useBooks';
import BookCard from '../components/BookCard';
import EditBookForm from '../components/EditBookForm';
import StatusMessage from '../components/StatusMessage';
import { api } from '../services/api';

function UserBooksPage() {
    const { books, setBooks, loading, error } = useBooks({ mine: true });
    const [editingBook, setEditingBook] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState(null);
    const [status, setStatus] = useState(null);

    const unsold = books.filter(book => !book.sold);
    const soldCount = books.length - unsold.length;

    const handleEditSubmit = async (formData) => {
        setSaving(true);
        setEditError(null);
        try {
            // The backend returns the updated listing (with a fresh image URL).
            const updated = await api.updateBook(editingBook.id, formData);
            setBooks(prev => prev.map(book => (book.id === updated.id ? updated : book)));
            setEditingBook(null);
            setStatus({ type: 'success', text: `"${updated.title}" was updated.` });
        } catch (err) {
            setEditError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading your items...</div>;
    if (error) return <StatusMessage type="error">{error}</StatusMessage>;

    return (
        <div>
            <h1 className="books-heading">Items you have listed in Marketplace!</h1>
            <StatusMessage type={status?.type}>{status?.text}</StatusMessage>
            {soldCount > 0 && (
                <p className="page-note">
                    {soldCount} of your {books.length} items {soldCount === 1 ? 'has' : 'have'} sold —{' '}
                    <Link to="/sold">see them here</Link>.
                </p>
            )}
            <div className="card-container">
                {editingBook && (
                    <EditBookForm
                        key={editingBook.id}
                        book={editingBook}
                        onSubmit={handleEditSubmit}
                        onCancel={() => { setEditingBook(null); setEditError(null); }}
                        saving={saving}
                        error={editError}
                    />
                )}
                {unsold.length === 0 ? (
                    <div className="no-books">You have no items for sale right now.</div>
                ) : (
                    unsold.map(book => (
                        <BookCard
                            key={book.id}
                            book={book}
                            onAction={() => { setEditError(null); setEditingBook(book); }}
                            actionLabel="Edit"
                            busy={saving}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default UserBooksPage;
