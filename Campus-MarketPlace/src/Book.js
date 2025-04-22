import { useEffect, useState } from 'react';

function BookForm() {
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState(null);
    const [message, setMessage] = useState('');
    const [userId, setUserId] = useState('');

    // Fetch userId from localStorage once when the component mounts
    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
        }
    }, []); // Empty dependency array ensures this runs only once after the first render

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);  // Get the selected image file
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prepare the form data
        const formData = new FormData();
        formData.append('title', title);
        formData.append('price', price);
        formData.append('description', description);
        formData.append('image', image);  // Append the image file
        formData.append('userId', userId);

        try {
            const response = await fetch('http://localhost:8080/books', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to add book');
            }

            const data = await response.json();
            setMessage('Book added successfully!');
        } catch (error) {
            setMessage('Failed to add book. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="book-form">
            <h2>Post an Item</h2>
            <div className="form-group">
                <label htmlFor="title">Title:</label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="price">Price:</label>
                <input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="description">Description:</label>
                <input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="image">Image:</label>
                <input
                    id="image"
                    type="file"
                    onChange={handleImageChange}
                    className="form-input"
                />
            </div>

            <button type="submit" className="submit-btn">Post Item</button>

            {message && <p className="message">{message}</p>}
        </form>
    );
}

export default BookForm;
