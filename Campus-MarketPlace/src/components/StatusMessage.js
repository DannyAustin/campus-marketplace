import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

const icons = {
    success: FiCheckCircle,
    error: FiAlertCircle,
    info: FiInfo,
};

// Inline feedback banner used instead of window.alert().
// `type` is one of "success", "error" or "info".
function StatusMessage({ type = 'info', children }) {
    if (!children) return null;
    const Icon = icons[type] || FiInfo;
    return (
        <div
            className={`status-message status-message--${type}`}
            role={type === 'error' ? 'alert' : 'status'}
        >
            <Icon size={18} aria-hidden="true" />
            <span>{children}</span>
        </div>
    );
}

export default StatusMessage;
