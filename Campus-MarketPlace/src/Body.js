import React, { useEffect, useState } from 'react';
import './App.css';

function Body({ userId, searchQuery }) { // Receive searchQuery as prop
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await fetch('http://localhost:8080/getallbooks');
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const data = await response.json();
                const soldItems = (data || []).filter(item => item.sold === false);
                setItems(soldItems || []);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    const handleAddToCart = async (bookId) => {
        try {
            const response = await fetch('http://localhost:8080/addtocart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    book_id: bookId,
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to add item to cart');
            }
            alert('Book added to cart successfully!');
            
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Filter items based on search query
    const filteredItems = items.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="loading">Loading books...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="card-container">
            {filteredItems.length === 0 ? (
                <div className="no-books">No books available at the moment.</div>
            ) : (
                filteredItems.map((item) => (
                    <div className="card" key={item.id}>
                        <img
                            src={`data:image/jpeg;base64,${item.image}`}
                            alt={item.title}
                            className="card-image"
                        />
                        <h2 className="card-title">{item.title}</h2>
                        <p className="card-description">{item.description}</p>
                        <p className="card-price">${item.price.toFixed(2)}</p>
                        
                        
                        <button
                            className="add-to-cart-btn"
                            onClick={() => handleAddToCart(item.id)}
                            disabled={item.user_id === userId}
                            title={item.user_id === userId ? "Book posted by you" : ""}
                        >
                            Add to Cart
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}

export default Body;
