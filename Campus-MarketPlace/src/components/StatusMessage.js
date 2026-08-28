import React from 'react';

// Inline feedback banner used instead of window.alert().
// `type` is one of "success", "error" or "info".
function StatusMessage({ type = 'info', children }) {
    if (!children) return null;
    return (
        <p
            className={`status-message status-message--${type}`}
            role={type === 'error' ? 'alert' : 'status'}
        >
            {children}
        </p>
    );
}

export default StatusMessage;
