import React, { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { api } from '../services/api';

function AddBookPage() {
    const { userId } = useAuthContext();
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        description: '',
        image: null
    });
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const submitData = new FormData();
        submitData.append('title', formData.title);
        submitData.append('price', formData.price);
        submitData.append('description', formData.description);
        submitData.append('image', formData.image);
        submitData.append('userId', userId);

        try {
            const response = await api.addBook(submitData);
            if (!response.ok) throw new Error('Failed to add book');
            
            setMessage('Book added successfully!');
            setFormData({ title: '', price: '', description: '', image: null });
        } catch (error) {
            setMessage('Failed to add book. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="book-form">
            <h2>Post an item</h2>
            <div className="form-group">
                <label htmlFor="title">Title:</label>
                <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="price">Price:</label>
                <input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="description">Description:</label>
                <input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="image">Image:</label>
                <input
                    id="image"
                    type="file"
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.files[0] }))}
                    className="form-input"
                />
            </div>

            <button type="submit" className="submit-btn">Post Item</button>
            {message && <p className="message">{message}</p>}
        </form>
    );
}

export default AddBookPage;