import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiImage } from 'react-icons/fi';
import { api, MAX_IMAGE_BYTES } from '../services/api';
import { CATEGORIES, CONDITIONS } from '../constants/listingOptions';
import StatusMessage from '../components/StatusMessage';

const emptyForm = { title: '', price: '', description: '', category: '', condition: '', image: null };

function NewListingPage() {
    const [formData, setFormData] = useState(emptyForm);
    const [status, setStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState('');

    // Preview the chosen photo, releasing the object URL when it changes.
    useEffect(() => {
        if (!formData.image) {
            setPreview('');
            return undefined;
        }
        const url = URL.createObjectURL(formData.image);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [formData.image]);

    const update = (field) => (e) => {
        const value = field === 'image' ? e.target.files[0] || null : e.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.image) {
            setStatus({ type: 'error', text: 'Please choose a photo for your item.' });
            document.getElementById('image')?.focus();
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
        <div>
            <div className="page-header">
                <h1 className="page-title">Post an item</h1>
                <span className="page-subtitle">It appears on the marketplace right away.</span>
            </div>

            <form onSubmit={handleSubmit} className="form-card listing-form">
                <label className="dropzone" htmlFor="image">
                    <span className="dropzone__preview">
                        {preview ? <img src={preview} alt="" /> : <FiImage size={28} aria-hidden="true" />}
                    </span>
                    <span className="dropzone__text">
                        <strong>{formData.image ? `Photo: ${formData.image.name}` : 'Choose a photo'}</strong>
                        <span id="image-hint">JPEG, PNG, GIF or WebP · up to 10 MB · required</span>
                    </span>
                    <input
                        id="image"
                        type="file"
                        className="visually-hidden"
                        accept="image/*"
                        aria-describedby="image-hint"
                        onChange={update('image')}
                    />
                </label>

                <div className="form-grid">
                    <div className="field field--full">
                        <label htmlFor="title">Title</label>
                        <input
                            id="title"
                            type="text"
                            className="input"
                            placeholder="e.g. Calculus textbook, 8th edition"
                            value={formData.title}
                            onChange={update('title')}
                            required
                            maxLength={120}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="category">Category</label>
                        <select
                            id="category"
                            className="select"
                            value={formData.category}
                            onChange={update('category')}
                            required
                        >
                            <option value="">Choose…</option>
                            {CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </div>

                    <div className="field">
                        <label htmlFor="condition">Condition</label>
                        <select
                            id="condition"
                            className="select"
                            value={formData.condition}
                            onChange={update('condition')}
                            required
                        >
                            <option value="">Choose…</option>
                            {CONDITIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </div>

                    <div className="field">
                        <label htmlFor="price">Price ($)</label>
                        <input
                            id="price"
                            type="number"
                            className="input"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={update('price')}
                            required
                        />
                    </div>

                    <div className="field field--full">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            className="textarea"
                            placeholder="Condition details, edition, pickup spot…"
                            value={formData.description}
                            onChange={update('description')}
                            maxLength={2000}
                            aria-describedby="description-count"
                        />
                        <span className="field__hint" id="description-count">{formData.description.length}/2000 characters</span>
                    </div>
                </div>

                <StatusMessage type={status?.type}>{status?.text}</StatusMessage>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary btn-lg submit-btn" disabled={submitting}>
                        {submitting ? 'Posting…' : 'Post Item'}
                    </button>
                </div>
            </form>

            <p className="form-aside">
                Want to change something you already posted? <Link to="/my-listings">Go to your listings</Link>.
            </p>
        </div>
    );
}

export default NewListingPage;
