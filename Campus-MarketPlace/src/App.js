import React, { useState } from 'react';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import UserBooksPage from './pages/UserBooksPage';
import AddBookPage from './pages/AddBookPage';
import NotificationsPage from './pages/NotificationsPage';
import CartPage from './pages/CartPage';
import { useAuthContext } from './context/AuthContext';
import './styles';
// Remove or use the Header import

function AppContent() {
    const { isLoggedIn, userId, logout } = useAuthContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [notificationCount, setNotificationCount] = useState(0);

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
            onSignOut={logout}
            onSearch={setSearchQuery}
            notificationCount={notificationCount}
        >
            <Routes>
                <Route path="/home" element={<HomePage userId={userId} searchQuery={searchQuery} />} />
                <Route path="/add-book" element={<AddBookPage />} />
                <Route path="/your-books" element={<UserBooksPage />} />
                <Route path="/notifications" element={
                    <NotificationsPage setNotificationCount={setNotificationCount} />
                } />
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
