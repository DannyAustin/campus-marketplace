import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import ListingCard from '../components/ListingCard';
import StatusMessage from '../components/StatusMessage';
import '../styles/CartPage.css';

const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;

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

    if (loading) return <div className="loading">Loading cart...</div>;

    return (
        <div className="cart-page">
            <h1 className="cart-title">Shopping Cart</h1>
            <StatusMessage type={status?.type}>{status?.text}</StatusMessage>
            <div className="cart-content">
                <div className="cart-items">
                    {items.length === 0 ? (
                        <p className="empty-cart">Your cart is empty</p>
                    ) : (
                        items.map(listing => (
                            <div key={listing.id} className="cart-item">
                                <ListingCard
                                    listing={listing}
                                    onAction={handleRemove}
                                    actionLabel={pendingId === listing.id ? 'Removing…' : 'Remove'}
                                    busy={pendingId === listing.id || checkingOut}
                                />
                                <div className="item-price">{money(listing.price)}</div>
                            </div>
                        ))
                    )}
                </div>
                {items.length > 0 && (
                    <div className="cart-summary">
                        <div className="summary-box">
                            <h2>Order Summary</h2>
                            <div className="summary-row">
                                <span>Items ({items.length})</span>
                                <span>{money(total)}</span>
                            </div>
                            <div className="summary-total">
                                <span>Total</span>
                                <span>{money(total)}</span>
                            </div>
                            <button
                                type="button"
                                className="checkout-button"
                                onClick={handleCheckout}
                                disabled={checkingOut || pendingId !== null}
                            >
                                {checkingOut ? 'Processing…' : 'Proceed to Checkout'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CartPage;
