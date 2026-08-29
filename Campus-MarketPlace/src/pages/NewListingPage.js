import React, { useState } from 'react';
import { api, MAX_IMAGE_BYTES } from '../services/api';
import { CATEGORIES, CONDITIONS } from '../constants/listingOptions';
import StatusMessage from '../components/StatusMessage';

const emptyForm = { title: '', price: '', description: '', category: '', condition: '', image: null };

function NewListingPage() {
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
        submitData.append('category', formData.category);
        submitData.append('condition', formData.condition);
        submitData.append('image', formData.image);

        const form = e.target;
        setSubmitting(true);
        setStatus(null);
        try {
            const listing = await api.addListing(submitData);
            setStatus({ type: 'success', text: `"${listing.title}" is now listed for $${Number(listing.price).toFixed(2)}.` });
            setFormData(emptyForm);
            form.reset(); // clears the (uncontrolled) file input as well
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="listing-form">
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

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="category">Category:</label>
                    <select
                        id="category"
                        value={formData.category}
                        onChange={update('category')}
                        className="form-input"
                        required
                    >
                        <option value="">Choose…</option>
                        {CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="condition">Condition:</label>
                    <select
                        id="condition"
                        value={formData.condition}
                        onChange={update('condition')}
                        className="form-input"
                        required
                    >
                        <option value="">Choose…</option>
                        {CONDITIONS.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
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

export default NewListingPage;
