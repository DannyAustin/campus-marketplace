import React from 'react';
import { api } from '../services/api';
import '../styles/BookCard.css';

// `disabled` hides the action button entirely (e.g. sold items);
// `busy` keeps it visible but unclickable while a request is in flight.
function BookCard({ book, onAction, actionLabel, disabled, busy }) {
    const price = Number(book.price) || 0;

    return (
        <div className="book-card">
            <img src={api.imageUrl(book)} alt={book.title} loading="lazy" />
            <div className="book-info">
                <h3>{book.title}</h3>
                <p>${price.toFixed(2)}</p>
                <p>{book.description}</p>
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => onAction(book)}
                        className="action-button"
                        disabled={busy}
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    );
}

export default BookCard;
