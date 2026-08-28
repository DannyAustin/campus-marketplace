import React, { useState } from 'react';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import UserBooksPage from './pages/UserBooksPage';
import AddBookPage from './pages/AddBookPage';
import SoldItemsPage from './pages/SoldItemsPage';
import CartPage from './pages/CartPage';
import './styles/App.css';

function AppContent() {
    const { isLoggedIn, username, logout } = useAuthContext();
    const [searchQuery, setSearchQuery] = useState('');

    if (!isLoggedIn) {
        return (
            <Routes>
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
        );
    }

    return (
        <Layout
            username={username}
            onSignOut={() => { setSearchQuery(''); logout(); }}
            onSearch={setSearchQuery}
        >
            <Routes>
                <Route path="/home" element={<HomePage searchQuery={searchQuery} />} />
                <Route path="/add-book" element={<AddBookPage />} />
                <Route path="/your-books" element={<UserBooksPage />} />
                <Route path="/sold" element={<SoldItemsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
        </Layout>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
