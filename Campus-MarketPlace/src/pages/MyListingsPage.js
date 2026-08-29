import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTag } from 'react-icons/fi';
import { useListings } from '../hooks/useListings';
import ListingCard from '../components/ListingCard';
import EditListingForm from '../components/EditListingForm';
import StatusMessage from '../components/StatusMessage';
import EmptyState from '../components/EmptyState';
import ListingGridSkeleton from '../components/ListingGridSkeleton';
import { api } from '../services/api';

function MyListingsPage() {
    const { listings, setListings, loading, error } = useListings({ mine: true });
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState(null);
    const [status, setStatus] = useState(null);

    const unsold = listings.filter(listing => !listing.sold);
    const soldCount = listings.length - unsold.length;

    const closeEditor = useCallback(() => {
        setEditing(null);
        setEditError(null);
    }, []);

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

    let content;
    if (loading) {
        content = <ListingGridSkeleton count={3} />;
    } else if (error) {
        content = null; // the alert above says what went wrong
    } else if (unsold.length === 0) {
        content = (
            <EmptyState
                icon={<FiTag size={24} />}
                title="You have no items for sale right now."
                action={<Link to="/new-listing" className="btn btn-primary">Post an item</Link>}
            >
                Anything you post shows up here, where you can edit it until it sells.
            </EmptyState>
        );
    } else {
        content = unsold.map(listing => (
            <ListingCard
                key={listing.id}
                listing={listing}
                onAction={() => { setEditError(null); setEditing(listing); }}
                actionLabel="Edit"
                icon={<FiEdit2 size={15} aria-hidden="true" />}
                busy={saving}
            />
        ));
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">My listings</h1>
                {!loading && !error && <span className="page-subtitle">{unsold.length} for sale</span>}
            </div>
            {soldCount > 0 && (
                <p className="page-note">
                    {soldCount} of your {listings.length} items {soldCount === 1 ? 'has' : 'have'} sold —{' '}
                    <Link to="/sold">see them here</Link>.
                </p>
            )}
            <StatusMessage type="error">{error}</StatusMessage>
            <StatusMessage type={status?.type}>{status?.text}</StatusMessage>

            {editing && (
                <EditListingForm
                    key={editing.id}
                    listing={editing}
                    onSubmit={handleEditSubmit}
                    onCancel={closeEditor}
                    saving={saving}
                    error={editError}
                />
            )}

            <div className="card-container">{content}</div>
        </div>
    );
}

export default MyListingsPage;
