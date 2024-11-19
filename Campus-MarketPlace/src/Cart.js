import React, { useEffect, useState } from 'react';
import './App.css';

function Cart() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState('');

    // Load userId from localStorage on component mount
    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
        }
    }, []);

    // Fetch cart items for the user
    useEffect(() => {
        if (!userId) return;

        const fetchBooks = async () => {
            setLoading(true);

            try {
                const response = await fetch(`http://localhost:8080/getcart?userId=${userId}`);
                if (!response.ok) throw new Error('Failed to fetch data');
                const data = await response.json();
                const availableItems = (data || []).filter(item => item.sold === false);
                setItems(availableItems);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [userId]);

    // Handle "Buy" button click to update book status and remove it from the cart in the database
    const handleBuy = async (bookId, cartItemId) => {
        try {
            const response = await fetch(`http://localhost:8080/updatebook`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, userId })
            });
    
            if (!response.ok) throw new Error('Failed to update book status');
    
            // Delete the cart item from the database
            await fetch(`http://localhost:8080/deletefromcart`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cartItemId })
            });
    
            // Filter out the bought book from the items list
            setItems(items.filter((item) => item.id !== bookId));
            alert('Book purchased and removed from the cart!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };
    

    if (loading) return <div className="loading">Loading books...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div>
            <h1 className="cart-heading">Books Added to Cart</h1> {/* Add the heading here */}
            <div className="card-container">
                {items.length === 0 ? (
                    <div className="no-books">No books added to the cart at the moment.</div>
                ) : (
                    items.map((item) => (
                        <div className="card" key={item.id}>
                            <img
                                src={`data:image/jpeg;base64,${item.image}`} 
                                alt={item.title}
                                className="card-image"
                            />
                            <h2 className="card-title">{item.title}</h2>
                            <p className="card-price">${item.price.toFixed(2)}</p>
                            <p className="card-description">{item.description}</p>
                            <button className="add-to-cart-btn" onClick={() => handleBuy(item.id)}>
                                Buy
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Cart;
