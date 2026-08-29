import React from 'react';
import { useListings } from '../hooks/useListings';
import ListingCard from '../components/ListingCard';
import StatusMessage from '../components/StatusMessage';

function SoldItemsPage() {
    const { listings, loading, error } = useListings({ mine: true });
    const sold = listings.filter(listing => listing.sold);

    if (loading) return <div className="loading">Loading your sold items...</div>;
    if (error) return <StatusMessage type="error">{error}</StatusMessage>;

    return (
        <div>
            <h1 className="page-title">Your Sold Items!</h1>
            <div className="card-container">
                {sold.length === 0 ? (
                    <div className="no-listings">No items have been sold yet.</div>
                ) : (
                    sold.map(listing => (
                        <ListingCard key={listing.id} listing={listing} disabled actionLabel="Sold" />
                    ))
                )}
            </div>
        </div>
    );
}

export default SoldItemsPage;
