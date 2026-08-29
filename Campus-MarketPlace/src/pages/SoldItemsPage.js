import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { useListings } from '../hooks/useListings';
import ListingCard, { money } from '../components/ListingCard';
import StatusMessage from '../components/StatusMessage';
import EmptyState from '../components/EmptyState';
import ListingGridSkeleton from '../components/ListingGridSkeleton';

function SoldItemsPage() {
    const { listings, loading, error } = useListings({ mine: true });
    const sold = listings.filter(listing => listing.sold);
    const earnings = sold.reduce((sum, listing) => sum + (Number(listing.price) || 0), 0);

    let content;
    if (loading) {
        content = <ListingGridSkeleton count={3} withButton={false} />;
    } else if (error) {
        content = null; // the alert above says what went wrong
    } else if (sold.length === 0) {
        content = (
            <EmptyState icon={<FiCheckCircle size={24} />} title="No items have been sold yet.">
                When someone checks out one of your listings, it shows up here.
            </EmptyState>
        );
    } else {
        content = sold.map(listing => (
            <ListingCard key={listing.id} listing={listing} disabled actionLabel="Sold" />
        ));
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Sold items</h1>
                {!loading && !error && sold.length > 0 && (
                    <span className="page-subtitle">{sold.length} sold · {money(earnings)} earned</span>
                )}
            </div>
            <StatusMessage type="error">{error}</StatusMessage>
            <div className="card-container">{content}</div>
        </div>
    );
}

export default SoldItemsPage;
