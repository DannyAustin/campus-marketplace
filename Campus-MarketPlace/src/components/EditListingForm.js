import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiImage } from 'react-icons/fi';
import { api, MAX_IMAGE_BYTES } from '../services/api';
import { CATEGORIES, CONDITIONS } from '../constants/listingOptions';
import StatusMessage from './StatusMessage';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal dialog for editing one of the user's own listings.
function EditListingForm({ listing, onSubmit, onCancel, saving, error }) {
    const [title, setTitle] = useState(listing.title);
    const [price, setPrice] = useState(listing.price);
    const [description, setDescription] = useState(listing.description || '');
    const [category, setCategory] = useState(listing.category || '');
    const [condition, setCondition] = useState(listing.condition || '');
    const [newImage, setNewImage] = useState(null);
    const [fileError, setFileError] = useState(null);
    const [preview, setPreview] = useState(api.imageUrl(listing));
    const modalRef = useRef(null);
    const firstField = useRef(null);

    // On open: remember what had focus, move focus in, lock page scroll.
    // On close: restore all of it.
    useEffect(() => {
        const opener = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        firstField.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            if (opener && typeof opener.focus === 'function') opener.focus();
        };
    }, []);

    // Escape closes; Tab is kept inside the dialog (aria-modal promises that).
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                // Escape that merely dismisses an open native <select> must not
                // throw the whole edit away (Firefox dispatches it to the document).
                if (e.target && e.target.tagName === 'SELECT') return;
                if (!saving) onCancel();
                return;
            }
            if (e.key !== 'Tab' || !modalRef.current) return;
            const focusable = Array.from(modalRef.current.querySelectorAll(FOCUSABLE));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel, saving]);

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
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onCancel(); }}>
            <div ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-listing-title">
                <div className="modal__header">
                    <h2 id="edit-listing-title">Edit item</h2>
                    <button type="button" className="modal__close" onClick={onCancel} aria-label="Close" disabled={saving}>
                        <FiX size={18} aria-hidden="true" />
                    </button>
                </div>

                <form className="edit-form" onSubmit={handleSubmit}>
                    <label className="dropzone" htmlFor="fileInput">
                        <span className="dropzone__preview">
                            {preview ? <img src={preview} alt="" /> : <FiImage size={28} aria-hidden="true" />}
                        </span>
                        <span className="dropzone__text">
                            <strong>{newImage ? `New photo: ${newImage.name}` : 'Change photo'}</strong>
                            <span>JPEG, PNG, GIF or WebP · up to 10 MB</span>
                        </span>
                        <input
                            type="file"
                            id="fileInput"
                            className="visually-hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </label>

                    <div className="form-grid">
                        <div className="field field--full">
                            <label htmlFor="edit-title">Title</label>
                            <input
                                id="edit-title"
                                ref={firstField}
                                className="input"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                maxLength={120}
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="edit-category">Category</label>
                            <select
                                id="edit-category"
                                className="select"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            >
                                <option value="">Choose…</option>
                                {CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="edit-condition">Condition</label>
                            <select
                                id="edit-condition"
                                className="select"
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                                required
                            >
                                <option value="">Choose…</option>
                                {CONDITIONS.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="edit-price">Price ($)</label>
                            <input
                                id="edit-price"
                                className="input"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>
                        <div className="field field--full">
                            <label htmlFor="edit-description">Description</label>
                            <textarea
                                id="edit-description"
                                className="textarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={2000}
                            />
                        </div>
                    </div>

                    <StatusMessage type="error">{fileError || error}</StatusMessage>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditListingForm;
