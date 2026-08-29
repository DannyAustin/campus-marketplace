import React from 'react';
import { api } from '../services/api';
import '../styles/ListingCard.css';

// `disabled` hides the action button entirely (e.g. sold items);
// `busy` keeps it visible but unclickable while a request is in flight.
function ListingCard({ listing, onAction, actionLabel, disabled, busy }) {
    const price = Number(listing.price) || 0;

    return (
        <div className="listing-card">
            <img src={api.imageUrl(listing)} alt={listing.title} loading="lazy" />
            <div className="listing-info">
                <h3>{listing.title}</h3>
                <p className="listing-price">${price.toFixed(2)}</p>
                <div className="listing-badges">
                    {listing.category && <span className="badge">{listing.category}</span>}
                    {listing.condition && <span className="badge badge--muted">{listing.condition}</span>}
                </div>
                <p>{listing.description}</p>
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => onAction(listing)}
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

export default ListingCard;
