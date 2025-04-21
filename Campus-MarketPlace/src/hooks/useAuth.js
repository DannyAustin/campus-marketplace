import { useState, useEffect } from 'react';

export const useAuth = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setIsLoggedIn(true);
            setUserId(storedUserId);
        }
    }, []);

    const login = (userId) => {
        localStorage.setItem('userId', userId);
        setIsLoggedIn(true);
        setUserId(userId);
    };

    const logout = () => {
        localStorage.removeItem('userId');
        setIsLoggedIn(false);
        setUserId(null);
    };

    return { isLoggedIn, userId, login, logout };
};