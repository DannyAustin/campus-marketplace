import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Colour theme: "light", "dark", or "system" (follow the OS setting).
// The choice is kept in localStorage and applied as <html data-theme="…">,
// which is what every colour token in App.css keys off. public/index.html
// runs the same logic inline before React loads so there is no flash.

export const THEME_STORAGE_KEY = 'theme';
export const THEMES = ['light', 'system', 'dark'];

const DARK_QUERY = '(prefers-color-scheme: dark)';
const META_COLOURS = { light: '#ffffff', dark: '#111a2b' };

const readStoredTheme = () => {
    try {
        const value = localStorage.getItem(THEME_STORAGE_KEY);
        return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
        return 'system';
    }
};

const systemTheme = () =>
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light');

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(readStoredTheme);
    const [system, setSystem] = useState(systemTheme);

    // Track OS changes while "system" is selected.
    useEffect(() => {
        if (!window.matchMedia) return undefined;
        const query = window.matchMedia(DARK_QUERY);
        const onChange = (e) => setSystem(e.matches ? 'dark' : 'light');
        if (query.addEventListener) {
            query.addEventListener('change', onChange);
            return () => query.removeEventListener('change', onChange);
        }
        query.addListener(onChange); // older Safari
        return () => query.removeListener(onChange);
    }, []);

    // Keep other open tabs in step when the choice changes in one of them.
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === THEME_STORAGE_KEY || e.key === null) setThemeState(readStoredTheme());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const resolved = theme === 'system' ? system : theme;

    // Apply the resolved theme to the document (and the browser chrome colour).
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolved);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', META_COLOURS[resolved]);
    }, [resolved]);

    const setTheme = useCallback((next) => {
        const value = THEMES.includes(next) ? next : 'system';
        setThemeState(value);
        try {
            if (value === 'system') {
                localStorage.removeItem(THEME_STORAGE_KEY);
            } else {
                localStorage.setItem(THEME_STORAGE_KEY, value);
            }
        } catch {
            // Storage unavailable (private mode, etc.): the choice just won't persist.
        }
    }, []);

    const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
