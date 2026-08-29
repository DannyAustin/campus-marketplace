import React from 'react';
import { FiX } from 'react-icons/fi';
import { CATEGORIES, CONDITIONS, SORT_OPTIONS } from '../constants/listingOptions';

// Category chips, condition, price range and sort for the Home page.
// `filters` holds the current values; `onChange(key, value)` updates one
// of them ('' clears it); `onClear()` resets everything.
function FilterBar({ filters, onChange, onClear, hasActiveFilters }) {
    return (
        <section className="filter-bar" aria-label="Filter listings">
            <div className="chip-row" role="group" aria-label="Category">
                <button
                    type="button"
                    className={`chip${!filters.category ? ' chip--active' : ''}`}
                    aria-pressed={!filters.category}
                    onClick={() => onChange('category', '')}
                >
                    All
                </button>
                {CATEGORIES.map(category => (
                    <button
                        key={category}
                        type="button"
                        className={`chip${filters.category === category ? ' chip--active' : ''}`}
                        aria-pressed={filters.category === category}
                        onClick={() => onChange('category', filters.category === category ? '' : category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="filter-controls">
                <div className="field">
                    <label htmlFor="filter-condition">Condition</label>
                    <select
                        id="filter-condition"
                        value={filters.condition || ''}
                        onChange={(e) => onChange('condition', e.target.value)}
                    >
                        <option value="">Any</option>
                        {CONDITIONS.map(condition => (
                            <option key={condition} value={condition}>{condition}</option>
                        ))}
                    </select>
                </div>

                <div className="field field--price">
                    <label htmlFor="filter-min">Min $</label>
                    <input
                        id="filter-min"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={filters.min_price || ''}
                        onChange={(e) => onChange('min_price', e.target.value)}
                    />
                </div>

                <div className="field field--price">
                    <label htmlFor="filter-max">Max $</label>
                    <input
                        id="filter-max"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Any"
                        value={filters.max_price || ''}
                        onChange={(e) => onChange('max_price', e.target.value)}
                    />
                </div>

                <div className="field">
                    <label htmlFor="filter-sort">Sort</label>
                    <select
                        id="filter-sort"
                        value={filters.sort || 'newest'}
                        onChange={(e) => onChange('sort', e.target.value === 'newest' ? '' : e.target.value)}
                    >
                        {SORT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>

                {hasActiveFilters && (
                    <button type="button" className="btn btn-ghost btn-sm filter-clear" onClick={onClear}>
                        <FiX size={14} aria-hidden="true" /> Clear filters
                    </button>
                )}
            </div>
        </section>
    );
}

export default FilterBar;
