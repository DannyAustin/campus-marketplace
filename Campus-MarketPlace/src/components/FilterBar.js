import React from 'react';
import { CATEGORIES, CONDITIONS, SORT_OPTIONS } from '../constants/listingOptions';

// Category chips, condition, price range and sort for the Home page.
// `filters` holds the current values; `onChange(key, value)` updates one
// of them ('' clears it); `onClear()` resets everything.
function FilterBar({ filters, onChange, onClear, hasActiveFilters }) {
    return (
        <div className="filter-bar" aria-label="Filter listings">
            <div className="chip-row" role="group" aria-label="Category">
                <button
                    type="button"
                    className={`chip${!filters.category ? ' chip--active' : ''}`}
                    onClick={() => onChange('category', '')}
                >
                    All
                </button>
                {CATEGORIES.map(category => (
                    <button
                        key={category}
                        type="button"
                        className={`chip${filters.category === category ? ' chip--active' : ''}`}
                        onClick={() => onChange('category', filters.category === category ? '' : category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="filter-controls">
                <label>
                    Condition
                    <select value={filters.condition || ''} onChange={(e) => onChange('condition', e.target.value)}>
                        <option value="">Any</option>
                        {CONDITIONS.map(condition => (
                            <option key={condition} value={condition}>{condition}</option>
                        ))}
                    </select>
                </label>

                <label>
                    Min $
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={filters.min_price || ''}
                        onChange={(e) => onChange('min_price', e.target.value)}
                    />
                </label>

                <label>
                    Max $
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="any"
                        value={filters.max_price || ''}
                        onChange={(e) => onChange('max_price', e.target.value)}
                    />
                </label>

                <label>
                    Sort
                    <select
                        value={filters.sort || 'newest'}
                        onChange={(e) => onChange('sort', e.target.value === 'newest' ? '' : e.target.value)}
                    >
                        {SORT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>

                {hasActiveFilters && (
                    <button type="button" className="chip chip--clear" onClick={onClear}>
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}

export default FilterBar;
