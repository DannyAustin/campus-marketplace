// Keep in sync with Categories / Conditions in Campus-MarketPlace-go/models.go.
export const CATEGORIES = ['Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Tickets', 'Sports', 'Other'];

export const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];

export const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
];

// Query-string keys understood by GET /listings (and mirrored in the Home URL).
export const FILTER_KEYS = ['q', 'category', 'condition', 'min_price', 'max_price', 'sort'];
