import React from 'react';
import Header from './Header';  // Updated import path

const Layout = ({ children, onSignOut, onSearch, notificationCount }) => {
    return (
        <div className="App">
            <Header 
                onSignOut={onSignOut}
                onSearch={onSearch}
                notificationCount={notificationCount}
            />
            <main>
                {children}
            </main>
        </div>
    );
};

export default Layout;