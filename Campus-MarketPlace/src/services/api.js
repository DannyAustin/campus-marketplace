// Every call to the Go backend goes through this module.
//
// Configure the backend location with REACT_APP_API_URL (see .env.example);
// it defaults to the local development server.
const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8080').replace(/\/$/, '');

// Must match maxImageBytes in the Go backend.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

// The signed-in session lives in localStorage so it survives a refresh.
export const session = {
    get token() {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    },
    get user() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY));
        } catch {
            return null;
        }
    },
    save({ token, user_id: id, username }) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify({ id, username }));
    },
    clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
};

// Called whenever an authenticated request comes back 401, so the app can
// drop a dead session instead of showing endless errors.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
    onUnauthorized = handler;
};

async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    // Remember which token this request was sent with, so a stale 401 that
    // arrives after the user has signed in again cannot wipe the new session.
    const tokenUsed = auth ? session.token : null;
    if (tokenUsed) {
        headers.Authorization = `Bearer ${tokenUsed}`;
    }

    let payload = body;
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
    } catch {
        throw new ApiError(0, 'Could not reach the server. Is the backend running?');
    }

    // Only trust JSON bodies. Anything else (a proxy's HTML error page, a
    // captive portal) is reduced to a generic message rather than rendered.
    const contentType = (response.headers && response.headers.get('content-type')) || '';
    let data = null;
    if (contentType.includes('application/json')) {
        try {
            data = JSON.parse(await response.text());
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        if (response.status === 401 && auth && onUnauthorized && session.token === tokenUsed) {
            onUnauthorized();
        }
        const message = (data && typeof data.error === 'string' && data.error) || `Request failed (${response.status})`;
        throw new ApiError(response.status, message);
    }
    return data;
}

// Sign-in/up responses must carry a token; refuse anything else.
async function authRequest(path, credentials) {
    const data = await request(path, { method: 'POST', body: credentials, auth: false });
    if (!data || typeof data.token !== 'string' || !data.token) {
        throw new ApiError(0, 'Unexpected response from the server');
    }
    return data;
}

// Builds "?a=1&b=2" from an object, skipping empty values.
const queryString = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') qs.set(key, value);
    });
    const s = qs.toString();
    return s ? `?${s}` : '';
};

export const api = {
    // auth
    register: (credentials) => authRequest('/register', credentials),
    login: (credentials) => authRequest('/login', credentials),
    me: () => request('/me'),

    // listings — `params` may contain q, category, condition, min_price, max_price, sort
    getListings: (params) => request(`/listings${queryString(params)}`),
    getMyListings: () => request('/listings/mine'),
    addListing: (formData) => request('/listings', { method: 'POST', body: formData }),
    updateListing: (listingId, formData) => request(`/listings/${listingId}`, { method: 'PUT', body: formData }),

    // cart
    getCart: () => request('/cart'),
    addToCart: (listingId) => request('/cart', { method: 'POST', body: { listing_id: listingId } }),
    removeFromCart: (listingId) => request(`/cart/${listingId}`, { method: 'DELETE' }),
    checkout: () => request('/checkout', { method: 'POST' }),

    // Photos are served by the backend; the URL already carries a cache-busting version.
    imageUrl: (listing) => (listing?.image_url ? `${API_URL}${listing.image_url}` : ''),
};
