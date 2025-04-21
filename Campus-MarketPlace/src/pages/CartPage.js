import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { api } from '../services/api';
import BookCard from '../components/BookCard';
import '../styles/CartPage.css';

function CartPage() {
    const { userId } = useAuthContext();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchCartItems = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                console.log('Fetching cart for userId:', userId);
                const response = await api.getCartItems(userId);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Cart data received:', data);

                if (!Array.isArray(data)) {
                    console.error('Unexpected data format:', data);
                    setCartItems([]);
                    return;
                }

                setCartItems(data);
            } catch (error) {
                console.error('Error fetching cart:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCartItems();
    }, [userId]);

    useEffect(() => {
        // Calculate total price whenever cart items change
        const cartTotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        setTotal(cartTotal);
    }, [cartItems]);

    const handleRemoveFromCart = async (book) => {
        try {
            console.log('Removing book:', book);
            // Match the ID structure used in addToCart
            const cartItemId = book._id || book.id;
            
            if (!cartItemId || !userId) {
                throw new Error('Missing required IDs');
            }

            const response = await api.removeFromCart(userId, cartItemId);
            
            // Mirror addToCart's response handling
            const responseText = await response.text();
            console.log('Remove from cart response:', responseText);
            
            if (!response.ok) {
                throw new Error(responseText || 'Failed to remove item');
            }

            // Update local state using same filtering logic as addToCart
            setCartItems(prevItems => prevItems.filter(item => (item._id || item.id) !== cartItemId));

        } catch (error) {
            console.error('Remove from cart error:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleCheckout = async () => {
        try {
            // Mark each book in cart as sold
            for (const book of cartItems) {
                const response = await api.updateBookStatus(book._id || book.id, userId);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to update book: ${errorText}`);
                }
            }

            // Clear the cart after successful checkout
            for (const book of cartItems) {
                const bookId = book._id || book.id;
                await api.removeFromCart(userId, bookId);
            }

            // Clear local cart state
            setCartItems([]);
            setTotal(0);
            alert('Checkout successful! Books have been marked as sold.');

        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to complete checkout. Please try again.');
        }
    };

    if (loading) return <div className="loading">Loading cart...</div>;

    return (
        <div className="cart-page">
            <h1 className="cart-title">Shopping Cart</h1>
            <div className="cart-content">
                <div className="cart-items">
                    {cartItems.length === 0 ? (
                        <p className="empty-cart">Your cart is empty</p>
                    ) : (
                        cartItems.map(book => (
                            <div key={book.id} className="cart-item">
                                <BookCard
                                    book={book}
                                    onAction={() => handleRemoveFromCart(book)}
                                    actionLabel="Remove"
                                />
                                <div className="item-price">
                                    ${parseFloat(book.price).toFixed(2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {cartItems.length > 0 && (
                    <div className="cart-summary">
                        <div className="summary-box">
                            <h2>Order Summary</h2>
                            <div className="summary-row">
                                <span>Items ({cartItems.length})</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            <div className="summary-total">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            <button 
                                className="checkout-button"
                                onClick={handleCheckout}
                                disabled={cartItems.length === 0}
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CartPage;