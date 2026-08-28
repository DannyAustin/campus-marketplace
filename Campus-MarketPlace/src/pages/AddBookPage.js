import React, { useState } from 'react';
import { api, MAX_IMAGE_BYTES } from '../services/api';
import StatusMessage from '../components/StatusMessage';

const emptyForm = { title: '', price: '', description: '', image: null };

function AddBookPage() {
    const [formData, setFormData] = useState(emptyForm);
    const [status, setStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const update = (field) => (e) => {
        const value = field === 'image' ? e.target.files[0] || null : e.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.image) {
            setStatus({ type: 'error', text: 'Please choose a photo for your item.' });
            return;
        }
        if (formData.image.size > MAX_IMAGE_BYTES) {
            setStatus({ type: 'error', text: 'That photo is too large - the limit is 10 MB.' });
            return;
        }

        const submitData = new FormData();
        submitData.append('title', formData.title);
        submitData.append('price', formData.price);
        submitData.append('description', formData.description);
        submitData.append('image', formData.image);

        const form = e.target;
        setSubmitting(true);
        setStatus(null);
        try {
            const book = await api.addBook(submitData);
            setStatus({ type: 'success', text: `"${book.title}" is now listed for $${Number(book.price).toFixed(2)}.` });
            setFormData(emptyForm);
            form.reset(); // clears the (uncontrolled) file input as well
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
        } finally {
            setSubmitting(false);
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
                    onChange={update('title')}
                    className="form-input"
                    required
                    maxLength={120}
                />
            </div>

            <div className="form-group">
                <label htmlFor="price">Price:</label>
                <input
                    id="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.price}
                    onChange={update('price')}
                    className="form-input"
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="description">Description:</label>
                <input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={update('description')}
                    className="form-input"
                    maxLength={2000}
                />
            </div>

            <div className="form-group">
                <label htmlFor="image">Photo (required):</label>
                <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={update('image')}
                    className="form-input"
                    required
                />
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Posting…' : 'Post Item'}
            </button>
            <StatusMessage type={status?.type}>{status?.text}</StatusMessage>
        </form>
    );
}

export default AddBookPage;
