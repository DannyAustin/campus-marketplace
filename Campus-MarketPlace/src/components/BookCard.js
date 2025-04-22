import React from 'react';
import '../styles/BookCard.css';

function BookCard({ book, onAction, actionLabel, disabled }) {
    // Convert price to number and handle invalid values
    const formattedPrice = parseFloat(book.price) || 0;

    return (
        <div className="book-card">
            <img 
                src={`data:image/jpeg;base64,${book.image}`} 
                alt={book.title} 
            />
            <div className="book-info">
                <h3>{book.title}</h3>
                <p>${formattedPrice.toFixed(2)}</p>
                <p>{book.description}</p>
                {!disabled && (
                    <button onClick={() => onAction(book)} className="action-button">
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    );
}

export default BookCard;