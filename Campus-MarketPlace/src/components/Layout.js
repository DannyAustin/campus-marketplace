import React from 'react';
import Header from './Header';

const Layout = ({ children, username, onSignOut, onSearch }) => (
    <div className="App">
        <Header username={username} onSignOut={onSignOut} onSearch={onSearch} />
        <main>{children}</main>
    </div>
);

export default Layout;
