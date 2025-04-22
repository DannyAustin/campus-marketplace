import React, { useEffect, useState } from 'react';
import './App.css';

function Userbooks() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [newImage, setNewImage] = useState(null);  // State for new image file

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
                if (!response.ok) throw new Error('Failed to fetch data');
                const data = await response.json();
                setItems(data || []);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [userId]);

    const handleEditClick = (item) => {
        setEditingItem(item);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!editingItem) return;

        const formData = new FormData();
        formData.append('title', editingItem.title);
        formData.append('price', editingItem.price);
        formData.append('description', editingItem.description);
        formData.append('id', editingItem.id);
        
        if (newImage) {
            formData.append('image', newImage);  // Appending the image file
        }
    
        try {
            const response = await fetch(`http://localhost:8080/updatebookdetails`, {
                method: 'PUT',
                body: formData,  // Send form data as is, no need for headers here
            });
    
            if (!response.ok) throw new Error('Failed to update book');
    
            // Update the items with the modified item, including the price
            setItems((prevItems) =>
                prevItems.map((item) => 
                    item.id === editingItem.id ? { ...item, price: editingItem.price, image: editingItem.image } : item
                )
            );
    
            setEditingItem(null);
            alert('Book updated successfully!');
        } catch (error) {
            console.log(error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditingItem((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setNewImage(file);

        // Update the preview
        const reader = new FileReader();
        reader.onload = () => {
            setEditingItem((prev) => ({
                ...prev,
                image: reader.result.split(',')[1]
            }));
        };
        reader.readAsDataURL(file);
    };

    if (loading) return <div className="loading">Loading books...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div>
            <h1 className="books-heading">Books Posted by You</h1> {/* Add the heading here */}
            <div className="card-container">
                {editingItem && (
                    <form className="edit-form" onSubmit={handleFormSubmit}>
                        <h2>Edit item</h2>
                        <div className="image-icon">
                            <img src={`data:image/jpeg;base64,${editingItem.image}`} alt="Book" />
                            <label htmlFor="fileInput">Change Photo</label>
                            <input
                                type="file"
                                id="fileInput"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                        <label>Title:</label>
                        <input
                            type="text"
                            name="title"
                            value={editingItem.title}
                            onChange={handleInputChange}
                        />
                        <label>Price:</label>
                        <input
                            type="number"
                            name="price"
                            value={editingItem.price}
                            onChange={handleInputChange}
                        />
                        <label>Description:</label>
                        <textarea
                            name="description"
                            value={editingItem.description}
                            onChange={handleInputChange}
                        />
                        <button type="submit">Save Changes</button>
                        <button type="button" onClick={() => setEditingItem(null)}>Cancel</button>
                    </form>
                )}
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
                            <h2 className="card-title">${item.title}</h2>
                            <p className="card-price">
                                ${item.price}
                            </p>
                            <p className="card-description">{item.description}</p>
                            <button className="edit-btn" onClick={() => handleEditClick(item)}>Edit</button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Userbooks;
