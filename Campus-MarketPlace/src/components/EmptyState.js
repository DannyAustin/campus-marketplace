import React from 'react';

// Friendly placeholder for "nothing here" situations.
function EmptyState({ icon, title, children, action, className = '' }) {
    return (
        <div className={`empty-state ${className}`.trim()}>
            {icon && <div className="empty-state__icon" aria-hidden="true">{icon}</div>}
            <h3>{title}</h3>
            {children && <p>{children}</p>}
            {action}
        </div>
    );
}

export default EmptyState;
