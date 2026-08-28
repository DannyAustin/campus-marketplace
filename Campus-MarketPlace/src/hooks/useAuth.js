import { useState, useEffect, useCallback } from 'react';
import { api, session, setUnauthorizedHandler } from '../services/api';

export const useAuth = () => {
    // Initialise synchronously from localStorage so a refresh doesn't flash
    // the sign-in page or lose the current route.
    const [user, setUser] = useState(() => (session.token ? session.user : null));

    const logout = useCallback(() => {
        session.clear();
        setUser(null);
    }, []);

    const login = useCallback((auth) => {
        session.save(auth);
        setUser({ id: auth.user_id, username: auth.username });
    }, []);

    // Any 401 from an authenticated call means the token is dead.
    useEffect(() => {
        setUnauthorizedHandler(logout);
        return () => setUnauthorizedHandler(null);
    }, [logout]);

    // Confirm a stored token still works (it may have expired, or the server
    // may have restarted with a new secret). A network failure keeps the
    // session so the user sees a "can't reach server" message instead.
    useEffect(() => {
        const token = session.token;
        if (!token) return undefined;
        let cancelled = false;
        api.me()
            .then((me) => {
                // Ignore a late reply if the user signed out (or in as someone
                // else) while the request was in flight.
                if (!cancelled && session.token === token) {
                    setUser({ id: me.user_id, username: me.username });
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    return {
        isLoggedIn: Boolean(user),
        userId: user?.id ?? null,
        username: user?.username ?? '',
        login,
        logout,
    };
};
