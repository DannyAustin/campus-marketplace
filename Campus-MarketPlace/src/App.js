import React from 'react';
import { Navigate, Route, BrowserRouter, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import MyListingsPage from './pages/MyListingsPage';
import NewListingPage from './pages/NewListingPage';
import SoldItemsPage from './pages/SoldItemsPage';
import CartPage from './pages/CartPage';
import './styles/App.css';

function AppContent() {
    const { isLoggedIn, username, logout } = useAuthContext();
    const location = useLocation();

    if (!isLoggedIn) {
        return (
            <Routes>
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                {/* Remember where the visitor was heading (e.g. a shared
                    /home?category=... link) so sign-in can send them there. */}
                <Route path="*" element={<Navigate to="/signin" replace state={{ from: location }} />} />
            </Routes>
        );
    }

    return (
        <Layout username={username} onSignOut={logout}>
            <Routes>
                <Route path="/home" element={<HomePage />} />
                <Route path="/new-listing" element={<NewListingPage />} />
                <Route path="/my-listings" element={<MyListingsPage />} />
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
