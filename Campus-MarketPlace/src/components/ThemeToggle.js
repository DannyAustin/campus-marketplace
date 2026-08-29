import React from 'react';
import { FiSun, FiMonitor, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const OPTIONS = [
    { value: 'light', label: 'Light', Icon: FiSun },
    { value: 'system', label: 'System', Icon: FiMonitor },
    { value: 'dark', label: 'Dark', Icon: FiMoon },
];

// Three-way Light / System / Dark switch. Icon-only in the top bar; the
// labels become visible inside the phone menu (see App.css).
function ThemeToggle({ className = '' }) {
    const { theme, setTheme } = useTheme();

    return (
        <div className={`theme-toggle ${className}`.trim()} role="group" aria-label="Colour theme">
            {OPTIONS.map(({ value, label, Icon }) => (
                <button
                    key={value}
                    type="button"
                    className={`theme-toggle__option${theme === value ? ' is-active' : ''}`}
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                >
                    <Icon size={16} aria-hidden="true" />
                    <span className="theme-toggle__label">{label}</span>
                </button>
            ))}
        </div>
    );
}

export default ThemeToggle;
