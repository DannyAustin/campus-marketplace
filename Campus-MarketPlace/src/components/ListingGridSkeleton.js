import React from 'react';

// Placeholder cards shown while the first page of listings loads. Sized to
// match a real card so the grid does not jump when data arrives.
function ListingGridSkeleton({ count = 4, withButton = true }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div className="skeleton-card" key={i} aria-hidden="true">
                    <div className="skeleton skeleton-card__media" />
                    <div className="skeleton-card__body">
                        <div className="skeleton" style={{ height: 18, width: '70%' }} />
                        <div className="skeleton" style={{ height: 14, width: '45%' }} />
                        <div className="skeleton" style={{ height: 14, width: '90%' }} />
                        <div className="skeleton" style={{ height: 14, width: '60%' }} />
                        {withButton && <div className="skeleton" style={{ height: 40, marginTop: 6 }} />}
                    </div>
                </div>
            ))}
            <span className="visually-hidden" role="status">Loading items…</span>
        </>
    );
}

export default ListingGridSkeleton;
