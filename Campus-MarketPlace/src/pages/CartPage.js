import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';
import { money } from '../components/ListingCard';
import StatusMessage from '../components/StatusMessage';
import EmptyState from '../components/EmptyState';

function CartPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);
    const [pendingId, setPendingId] = useState(null);
    const [checkingOut, setCheckingOut] = useState(false);

    // `quiet` reloads without replacing a message that is already showing
    // (e.g. the checkout receipt).
    const load = useCallback(async ({ quiet = false } = {}) => {
        try {
            setItems(await api.getCart());
        } catch (err) {
            if (!quiet) setStatus({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const total = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
        [items]
    );

    const handleRemove = async (listing) => {
        if (pendingId) return; // one request at a time
        setPendingId(listing.id);
        setStatus(null);
        try {
            await api.removeFromCart(listing.id);
            setItems(prev => prev.filter(item => item.id !== listing.id));
            setStatus({ type: 'info', text: `"${listing.title}" was removed from your cart.` });
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
        } finally {
            setPendingId(null);
        }
    };

    const handleCheckout = async () => {
        setCheckingOut(true);
        setStatus(null);
        try {
            // One request; the server claims each item atomically and tells us
            // exactly what went through.
            const result = await api.checkout();
            const lines = [];
            if (result.purchased.length > 0) {
                lines.push(`Purchased (${money(result.total)}): ${result.purchased.map(p => p.title).join(', ')}`);
            }
            if (result.unavailable.length > 0) {
                lines.push('Not available: ' + result.unavailable.map(u => `${u.title} — ${u.reason}`).join('; '));
            }
            setStatus({
                type: result.unavailable.length === 0 ? 'success' : 'info',
                text: lines.join('\n'),
            });
            await load({ quiet: true }); // keep the receipt on screen
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
            if (err.status !== 401) await load({ quiet: true });
        } finally {
            setCheckingOut(false);
        }
    };

    let body;
    if (loading) {
        body = <p className="muted" role="status">Loading cart…</p>;
    } else if (items.length === 0) {
        body = (
            <EmptyState
                className="empty-cart"
                icon={<FiShoppingCart size={24} />}
                title="Your cart is empty"
                action={<Link to="/home" className="btn btn-primary">Browse items</Link>}
            >
                Add something from the marketplace and it will wait for you here.
            </EmptyState>
        );
    } else {
        body = (
            <div className="cart-layout">
                <div className="cart-items">
                    {items.map(listing => (
                        <div key={listing.id} className="cart-item">
                            <img className="cart-item__thumb" src={api.imageUrl(listing)} alt="" />
                            <div className="cart-item__info">
                                <h3>{listing.title}</h3>
                                <div className="listing-badges">
                                    {listing.category && <span className="badge">{listing.category}</span>}
                                    {listing.condition && <span className="badge badge--muted">{listing.condition}</span>}
                                </div>
                                {listing.description && <p className="cart-item__desc">{listing.description}</p>}
                            </div>
                            <div className="cart-item__side">
                                <span className="item-price">{money(listing.price)}</span>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleRemove(listing)}
                                    disabled={pendingId === listing.id || checkingOut}
                                    aria-label={`Remove ${listing.title} from cart`}
                                >
                                    <FiTrash2 size={14} aria-hidden="true" />
                                    {pendingId === listing.id ? 'Removing…' : 'Remove'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <aside className="summary-box" aria-label="Order summary">
                    <h2>Order summary</h2>
                    <div className="summary-row">
                        <span>Items ({items.length})</span>
                        <span>{money(total)}</span>
                    </div>
                    <div className="summary-row">
                        <span>Fees</span>
                        <span>$0.00</span>
                    </div>
                    <div className="summary-total">
                        <span>Total</span>
                        <span>{money(total)}</span>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary btn-lg btn-block checkout-button"
                        onClick={handleCheckout}
                        disabled={checkingOut || pendingId !== null}
                    >
                        {checkingOut ? 'Processing…' : 'Proceed to Checkout'}
                    </button>
                </aside>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="page-header">
                <h1 className="page-title">Your cart</h1>
                {!loading && <span className="page-subtitle">{items.length} {items.length === 1 ? 'item' : 'items'}</span>}
            </div>
            <StatusMessage type={status?.type}>{status?.text}</StatusMessage>
            {body}
        </div>
    );
}

export default CartPage;
