import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/App.css';  // Updated path

function Header({ onSignOut, onSearch }) {  // Removed notificationCount from props
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
                    type="text"
                    className="search-input"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            )}

            <div className="header-right">
                <Link to="/notifications">Sold</Link>
                <Link to="/add-book">Post an item</Link>
                <Link to="/your-books">Items you listed</Link>
                <Link to="/cart">Cart</Link>
                <Link className="active" to="/" onClick={onSignOut}>Signout</Link>
            </div>
        </div>
    );
}

export default Header;
