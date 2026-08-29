import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiShoppingCart, FiSearch, FiPackage } from 'react-icons/fi';
import { useListings } from '../hooks/useListings';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { FILTER_KEYS } from '../constants/listingOptions';
import ListingCard from '../components/ListingCard';
import FilterBar from '../components/FilterBar';
import StatusMessage from '../components/StatusMessage';
import EmptyState from '../components/EmptyState';
import ListingGridSkeleton from '../components/ListingGridSkeleton';
import { api } from '../services/api';

// Free-text inputs are debounced; chips and selects apply immediately.
const TEXT_KEYS = ['q', 'min_price', 'max_price'];
const MAX_SEARCH_LENGTH = 100;

// Pull the known filter keys out of the URL; anything else is ignored.
const readFilters = (searchParams) => {
    const filters = {};
    FILTER_KEYS.forEach((key) => {
        const value = (searchParams.get(key) || '').trim();
        if (value) filters[key] = value;
    });
    return filters;
};

const pick = (object, keys) =>
    Object.fromEntries(Object.entries(object).filter(([key]) => keys.includes(key)));

// Turn URL filters into API parameters, dropping anything the server would
// reject so a half-typed price never blanks the page with a 400.
const toParams = (filters) => {
    const params = { ...filters };
    const min = Number(params.min_price);
    const max = Number(params.max_price);
    if (params.min_price !== undefined && !(min >= 0)) delete params.min_price;
    if (params.max_price !== undefined && !(max >= 0)) delete params.max_price;
    if (params.min_price !== undefined && params.max_price !== undefined && min > max) delete params.max_price;
    if (params.sort === 'newest') delete params.sort;
    if (params.q) params.q = params.q.slice(0, MAX_SEARCH_LENGTH);
    return params;
};

function HomePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = useMemo(() => readFilters(searchParams), [searchParams]);

    // Debounce only the typed inputs; memoise by value so a chip click does
    // not restart the text debounce timer.
    const textKey = JSON.stringify(pick(filters, TEXT_KEYS));
    const textFilters = useMemo(() => JSON.parse(textKey), [textKey]);
    const debouncedText = useDebouncedValue(textFilters, 300);
    const discreteKey = JSON.stringify(pick(filters, FILTER_KEYS.filter(k => !TEXT_KEYS.includes(k))));
    const params = useMemo(
        () => toParams({ ...JSON.parse(discreteKey), ...debouncedText }),
        [discreteKey, debouncedText]
    );

    const { listings, loading, refreshing, error } = useListings({ params });
    const [status, setStatus] = useState(null);
    const [pendingId, setPendingId] = useState(null);

    const setFilter = (key, value) => {
        const next = new URLSearchParams(searchParams);
        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        setSearchParams(next, { replace: true });
    };
    const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });
    // Judged on what was actually sent, so the empty-state text matches the results.
    const hasActiveFilters = Object.keys(params).length > 0;

    const handleAddToCart = async (listing) => {
        if (pendingId) return; // one request at a time
        setPendingId(listing.id);
        setStatus(null);
        try {
            await api.addToCart(listing.id);
            setStatus({ type: 'success', text: `"${listing.title}" was added to your cart.` });
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
        } finally {
            setPendingId(null);
        }
    };

    let results;
    if (loading) {
        results = <ListingGridSkeleton />;
    } else if (listings.length === 0) {
        results = hasActiveFilters ? (
            <EmptyState
                icon={<FiSearch size={24} />}
                title="Nothing matches your filters."
                action={<button type="button" className="btn btn-secondary" onClick={clearFilters}>Reset search</button>}
            >
                Try a different category, a wider price range, or fewer words.
            </EmptyState>
        ) : (
            <EmptyState icon={<FiPackage size={24} />} title="The market is empty. It's time you sell something!">
                Nobody else has listed anything yet — be the first.
            </EmptyState>
        );
    } else {
        results = listings.map(listing => (
            <ListingCard
                key={listing.id}
                listing={listing}
                onAction={handleAddToCart}
                actionLabel={pendingId === listing.id ? 'Adding…' : 'Add to Cart'}
                icon={<FiShoppingCart size={16} aria-hidden="true" />}
                busy={pendingId === listing.id}
            />
        ));
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Browse items</h1>
                {!loading && (
                    <span className="page-subtitle">
                        {listings.length} {listings.length === 1 ? 'item' : 'items'}{hasActiveFilters ? ' match' : ' for sale'}
                    </span>
                )}
            </div>
            <FilterBar
                filters={filters}
                onChange={setFilter}
                onClear={clearFilters}
                hasActiveFilters={Object.keys(filters).length > 0}
            />
            <StatusMessage type="error">{error}</StatusMessage>
            <StatusMessage type={status?.type}>{status?.text}</StatusMessage>
            {/* Previous results stay on screen (dimmed) while a new filter loads. */}
            <div className="card-container" aria-busy={refreshing && !loading}>{results}</div>
        </div>
    );
}

export default HomePage;
