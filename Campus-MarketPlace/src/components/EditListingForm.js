import React, { useState, useEffect } from 'react';
import { api, MAX_IMAGE_BYTES } from '../services/api';
import { CATEGORIES, CONDITIONS } from '../constants/listingOptions';
import StatusMessage from './StatusMessage';

function EditListingForm({ listing, onSubmit, onCancel, saving, error }) {
    const [title, setTitle] = useState(listing.title);
    const [price, setPrice] = useState(listing.price);
    const [description, setDescription] = useState(listing.description || '');
    const [category, setCategory] = useState(listing.category || '');
    const [condition, setCondition] = useState(listing.condition || '');
    const [newImage, setNewImage] = useState(null);
    const [fileError, setFileError] = useState(null);
    const [preview, setPreview] = useState(api.imageUrl(listing));

    // Show the freshly chosen file straight away, and release the object URL
    // when it is replaced or the form closes.
    useEffect(() => {
        if (!newImage) {
            setPreview(api.imageUrl(listing));
            return undefined;
        }
        const url = URL.createObjectURL(newImage);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [newImage, listing]);

    const handleImageChange = (e) => {
        const file = e.target.files[0] || null;
        if (file && file.size > MAX_IMAGE_BYTES) {
            setFileError('That photo is too large - the limit is 10 MB.');
            setNewImage(null);
            return;
        }
        setFileError(null);
        setNewImage(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('price', price);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('condition', condition);
        // Only send a photo when a new one was picked; the backend keeps the
        // existing one otherwise.
        if (newImage) {
            formData.append('image', newImage);
        }
        onSubmit(formData);
    };

    return (
        <form className="edit-form" onSubmit={handleSubmit}>
            <h2>Edit item</h2>
            <div className="image-icon">
                <img src={preview} alt={title || 'Item'} />
                <label htmlFor="fileInput">Change Photo</label>
                <input
                    type="file"
                    id="fileInput"
                    accept="image/*"
                    onChange={handleImageChange}
                />
            </div>
            <label htmlFor="edit-title">Title:</label>
            <input
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
            />
            <label htmlFor="edit-price">Price:</label>
            <input
                id="edit-price"
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
            />
            <label htmlFor="edit-category">Category:</label>
            <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
            >
                <option value="">Choose…</option>
                {CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <label htmlFor="edit-condition">Condition:</label>
            <select
                id="edit-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
            >
                <option value="">Choose…</option>
                {CONDITIONS.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <label htmlFor="edit-description">Description:</label>
            <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
            />
            <StatusMessage type="error">{fileError || error}</StatusMessage>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        </form>
    );
}

export default EditListingForm;
