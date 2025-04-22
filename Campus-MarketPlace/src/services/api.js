// Add API_URL constant at the top of the file
const API_URL = 'http://localhost:8080';

export const api = {
    login: async (userData) => {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        return response;
    },

    register: async (userData) => {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        return response;
    },

    getAllBooks: async () => {
        const response = await fetch(`${API_URL}/getallbooks`);
        return response;
    },

    getUserBooks: async (userId) => {
        const response = await fetch(`${API_URL}/user/books?userId=${userId}`);
        return response;
    },

    addToCart: async (userId, bookId) => {
        console.log('API addToCart called with:', { userId, bookId });
        const response = await fetch(`${API_URL}/addtocart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                book_id: bookId
            })
        });
        console.log('API addToCart response:', response);
        return response;
    },

    getCartItems: async (userId) => {
        console.log('Fetching cart items for user:', userId);
        const response = await fetch(`${API_URL}/getcart?userId=${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Get cart items response:', response);
        return response;
    },

    removeFromCart: async (userId, bookId) => {
        console.log('API removeFromCart called with:', { userId, bookId });
        const response = await fetch(`${API_URL}/deletefromcart`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                book_id: bookId
            })
        });
        console.log('API removeFromCart response:', response);
        return response;
    },

    updateBook: async (formData) => {
        const response = await fetch(`${API_URL}/updatebookdetails`, {
            method: 'PUT',
            body: formData, // FormData already has the correct format
        });
        return response;
    },

    updateBookStatus: async (bookId, userId) => {
        return fetch(`${API_URL}/updatebook`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bookId: bookId,
                userId: userId
            })
        });
    },

    addBook: async (formData) => {
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            body: formData, // FormData already has the correct format
        });
        return response;
    },
};