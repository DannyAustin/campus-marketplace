import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Header({ username, onSignOut, onSearch }) {
    const [searchTerm, setSearchTerm] = useState('');
    const location = useLocation();

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        onSearch(e.target.value);
    };

    return (
        <div className="header">
            <Link to="/home" className="logo">Campus MarketPlace</Link>

            {location.pathname === '/home' && (
                <input
                    type="search"
                    className="search-input"
                    placeholder="Search items..."
                    aria-label="Search items"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            )}

            <div className="header-right">
                <Link to="/sold">Sold</Link>
                <Link to="/add-book">Post an item</Link>
                <Link to="/your-books">Items you listed</Link>
                <Link to="/cart">Cart</Link>
                {username && <span className="header-user">Hi, {username}</span>}
                <Link className="active" to="/signin" onClick={onSignOut}>Sign out</Link>
            </div>
        </div>
    );
}

export default Header;
