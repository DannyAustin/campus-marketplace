import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiGrid, FiPlusCircle, FiTag, FiShoppingCart, FiCheckCircle, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';

// "Browse" duplicates the brand link on desktop, so it only appears in the phone menu.
const NAV_ITEMS = [
    { to: '/home', label: 'Browse', Icon: FiGrid, mobileOnly: true },
    { to: '/new-listing', label: 'Post an item', Icon: FiPlusCircle },
    { to: '/my-listings', label: 'My listings', Icon: FiTag },
    { to: '/sold', label: 'Sold', Icon: FiCheckCircle },
    { to: '/cart', label: 'Cart', Icon: FiShoppingCart },
];

const navClass = (mobileOnly) => ({ isActive }) =>
    `nav-link${isActive ? ' is-active' : ''}${mobileOnly ? ' nav-link--mobile-only' : ''}`;

function Header({ username, onSignOut }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [menuOpen, setMenuOpen] = useState(false);
    const toggleRef = useRef(null);
    const onHome = location.pathname === '/home';

    // Close the mobile menu whenever the route changes.
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    // Escape closes it and hands focus back to the toggle, so a keyboard
    // user does not lose their place when the links disappear.
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
                toggleRef.current?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [menuOpen]);

    // An explicit sign-out goes to a clean sign-in page: the next person to
    // sign in must not be sent back to the previous user's page.
    const handleSignOut = () => {
        onSignOut();
        navigate('/signin', { replace: true });
    };

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
        <header className="topbar">
            <div className="topbar__inner">
                <Link to="/home" className="brand" aria-label="Campus Marketplace home">
                    <span className="brand__mark" aria-hidden="true">CM</span>
                    <span className="brand__name">Campus <span>Marketplace</span></span>
                </Link>

                {/* The toggle precedes the search in the DOM so Tab order matches the phone layout. */}
                <button
                    ref={toggleRef}
                    type="button"
                    className="topbar__toggle"
                    aria-label="Menu"
                    aria-expanded={menuOpen}
                    aria-controls="primary-navigation"
                    onClick={() => setMenuOpen(open => !open)}
                >
                    {menuOpen ? <FiX size={20} aria-hidden="true" /> : <FiMenu size={20} aria-hidden="true" />}
                </button>

                {onHome && (
                    <div className="topbar__search">
                        <FiSearch size={16} aria-hidden="true" />
                        <input
                            type="search"
                            className="search-input"
                            placeholder="Search items…"
                            aria-label="Search items"
                            maxLength={100}
                            value={searchParams.get('q') || ''}
                            onChange={handleSearchChange}
                        />
                    </div>
                )}

                {/* Tapping any link closes the mobile menu, even when it points at the current page. */}
                <nav
                    id="primary-navigation"
                    className={`topbar__nav${menuOpen ? ' is-open' : ''}`}
                    aria-label="Primary"
                    onClick={(e) => { if (e.target.closest('a')) setMenuOpen(false); }}
                >
                    {NAV_ITEMS.map(({ to, label, Icon, mobileOnly }) => (
                        <NavLink key={to} to={to} className={navClass(mobileOnly)}>
                            <Icon size={16} aria-hidden="true" />
                            <span className="nav-link__label">{label}</span>
                        </NavLink>
                    ))}
                    <ThemeToggle className="topbar__theme" />
                    {username && (
                        <span className="user-chip" title={`Signed in as ${username}`}>
                            <span className="avatar" aria-hidden="true">{username.charAt(0)}</span>
                            <span className="visually-hidden">Signed in as </span>
                            <span className="user-chip__name">{username}</span>
                        </span>
                    )}
                    <button type="button" className="nav-link" onClick={handleSignOut}>
                        <FiLogOut size={16} aria-hidden="true" />
                        <span className="nav-link__label">Sign out</span>
                    </button>
                </nav>
            </div>
        </header>
    );
}

export default Header;
