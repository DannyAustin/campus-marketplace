import React from 'react';
import Header from './Header';

const Layout = ({ children, username, onSignOut }) => (
    <div className="app-shell">
        <a className="skip-link" href="#main">Skip to content</a>
        <Header username={username} onSignOut={onSignOut} />
        <main id="main" className="page" tabIndex={-1}>{children}</main>
        <footer className="app-footer">Campus Marketplace — buy and sell with your fellow students.</footer>
    </div>
);

export default Layout;
