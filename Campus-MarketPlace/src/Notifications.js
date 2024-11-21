import React, { useEffect, useState } from 'react';
import './App.css';

function Notifications({ setNotificationCount }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState('');

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
        }
    }, []);

    useEffect(() => {
        if (!userId) return;

        const fetchBooks = async () => {
            setLoading(true);

            try {
                const response = await fetch(`http://localhost:8080/user/books?userId=${userId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const data = await response.json();
                const soldItems = (data || []).filter(item => item.sold === true);
                setItems(soldItems);
                setNotificationCount(soldItems.length);  // Update notification count
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [userId, setNotificationCount]);

    if (loading) {
        return <div className="loading">Loading books...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div>
            <h1>The following books posted by you have been sold:</h1>
            <div className="card-container">
                {items.length === 0 ? (
                    <div className="no-books">No books available at the moment.</div>
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
            
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Notifications;
