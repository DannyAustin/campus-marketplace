import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

function Header({ username, onSignOut }) {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const onHome = location.pathname === '/home';

    // The search text lives in the URL (?q=...) so it survives a refresh,
    // can be shared, and is read by the Home page alongside the other filters.
    const handleSearchChange = (e) => {
        const next = new URLSearchParams(searchParams);
        if (e.target.value) {
            next.set('q', e.target.value);
        } else {
            next.delete('q');
        }
        setSearchParams(next, { replace: true });
    };

    return (
        <div className="header">
            <Link to="/home" className="logo">Campus MarketPlace</Link>

            {onHome && (
                <input
                    type="search"
                    className="search-input"
                    placeholder="Search items..."
                    aria-label="Search items"
                    maxLength={100}
                    value={searchParams.get('q') || ''}
                    onChange={handleSearchChange}
                />
            )}

            <div className="header-right">
                <Link to="/sold">Sold</Link>
                <Link to="/new-listing">Post an item</Link>
                <Link to="/my-listings">Items you listed</Link>
                <Link to="/cart">Cart</Link>
                {username && <span className="header-user">Hi, {username}</span>}
                <Link className="active" to="/signin" onClick={onSignOut}>Sign out</Link>
            </div>
        </div>
    );
}

export default Header;
