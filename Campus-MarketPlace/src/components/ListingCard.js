import React from 'react';
import { api } from '../services/api';

export const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;

// `disabled` hides the action button entirely (e.g. sold items);
// `busy` keeps it visible but unclickable while a request is in flight.
function ListingCard({ listing, onAction, actionLabel, disabled, busy, icon }) {
    return (
        <article className={`listing-card${disabled ? ' listing-card--static' : ''}`}>
            <div className="listing-card__media">
                {/* Decorative: the title is announced from the heading right below. */}
                <img src={api.imageUrl(listing)} alt="" loading="lazy" />
                {listing.sold && <span className="ribbon">Sold</span>}
            </div>
            <div className="listing-card__body">
                <div className="listing-card__top">
                    <h3 className="listing-card__title">{listing.title}</h3>
                    <span className="listing-card__price">{money(listing.price)}</span>
                </div>
                <div className="listing-badges">
                    {listing.category && <span className="badge">{listing.category}</span>}
                    {listing.condition && <span className="badge badge--muted">{listing.condition}</span>}
                </div>
                <p className="listing-card__desc">{listing.description}</p>
            </div>
            {!disabled && (
                <div className="listing-card__footer">
                    <button
                        type="button"
                        onClick={() => onAction(listing)}
                        className="btn btn-primary btn-block action-button"
                        disabled={busy}
                    >
                        {icon}
                        {actionLabel}
                    </button>
                </div>
            )}
        </article>
    );
}

export default ListingCard;
