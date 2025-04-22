import React, { useState } from 'react';

function EditBookForm({ book, onSubmit, onCancel }) {
    const [newImage, setNewImage] = useState(null);
    const [formData, setFormData] = useState(book);

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = new FormData();
        submitData.append('title', formData.title);
        submitData.append('price', formData.price);
        submitData.append('description', formData.description);
        submitData.append('id', formData.id);
        
        // Only append new image if one was selected
        if (newImage) {
            submitData.append('image', newImage);
        } else {
            // Keep the existing image
            submitData.append('image', formData.image);
        }
        
        onSubmit(submitData);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewImage(file);
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                setFormData(prev => ({
                    ...prev,
                    image: base64String
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <form className="edit-form" onSubmit={handleSubmit}>
            <h2>Edit item</h2>
            <div className="image-icon">
                <img src={`data:image/jpeg;base64,${formData.image}`} alt="Book" />
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
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            <label>Price:</label>
            <input
                type="number"
                name="price"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            />
            <label>Description:</label>
            <textarea
                name="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
            <button type="submit">Save Changes</button>
            <button type="button" onClick={onCancel}>Cancel</button>
        </form>
    );
}

export default EditBookForm;