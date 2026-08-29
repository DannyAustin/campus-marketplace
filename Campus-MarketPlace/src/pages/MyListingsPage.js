import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListings } from '../hooks/useListings';
import ListingCard from '../components/ListingCard';
import EditListingForm from '../components/EditListingForm';
import StatusMessage from '../components/StatusMessage';
import { api } from '../services/api';

function MyListingsPage() {
    const { listings, setListings, loading, error } = useListings({ mine: true });
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState(null);
    const [status, setStatus] = useState(null);

    const unsold = listings.filter(listing => !listing.sold);
    const soldCount = listings.length - unsold.length;

    const handleEditSubmit = async (formData) => {
        setSaving(true);
        setEditError(null);
        try {
            // The backend returns the updated listing (with a fresh image URL).
            const updated = await api.updateListing(editing.id, formData);
            setListings(prev => prev.map(listing => (listing.id === updated.id ? updated : listing)));
            setEditing(null);
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
            <h1 className="page-title">Items you have listed in Marketplace!</h1>
            <StatusMessage type={status?.type}>{status?.text}</StatusMessage>
            {soldCount > 0 && (
                <p className="page-note">
                    {soldCount} of your {listings.length} items {soldCount === 1 ? 'has' : 'have'} sold —{' '}
                    <Link to="/sold">see them here</Link>.
                </p>
            )}
            <div className="card-container">
                {editing && (
                    <EditListingForm
                        key={editing.id}
                        listing={editing}
                        onSubmit={handleEditSubmit}
                        onCancel={() => { setEditing(null); setEditError(null); }}
                        saving={saving}
                        error={editError}
                    />
                )}
                {unsold.length === 0 ? (
                    <div className="no-listings">You have no items for sale right now.</div>
                ) : (
                    unsold.map(listing => (
                        <ListingCard
                            key={listing.id}
                            listing={listing}
                            onAction={() => { setEditError(null); setEditing(listing); }}
                            actionLabel="Edit"
                            busy={saving}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default MyListingsPage;
