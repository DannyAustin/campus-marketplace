import React from 'react';
import Header from './Header';

const Layout = ({ children, username, onSignOut }) => (
    <div className="App">
        <Header username={username} onSignOut={onSignOut} />
        <main>{children}</main>
    </div>
);

export default Layout;
