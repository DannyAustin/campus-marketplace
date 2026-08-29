import React from 'react';
import { FiCheck } from 'react-icons/fi';

// Split-screen shell for the sign-in / sign-up pages.
function AuthLayout({ children }) {
    return (
        <div className="auth">
            <aside className="auth__panel">
                <div className="brand">
                    <span className="brand__mark" aria-hidden="true">CM</span>
                    <span className="brand__name">Campus <span>Marketplace</span></span>
                </div>
                <div>
                    <h1 className="auth__headline">Buy and sell with the people on your campus.</h1>
                    <p className="auth__lead">
                        Textbooks, furniture, tickets, electronics — list it in a minute, hand it over between classes.
                    </p>
                    <ul className="auth__features">
                        <li><FiCheck size={18} aria-hidden="true" /> Post an item with a photo in seconds</li>
                        <li><FiCheck size={18} aria-hidden="true" /> Search and filter by category, condition and price</li>
                        <li><FiCheck size={18} aria-hidden="true" /> Checkout claims an item for you — no double selling</li>
                    </ul>
                </div>
                <p className="auth__footnote">Free for students. No fees, no ads.</p>
            </aside>
            <section className="auth__form">{children}</section>
        </div>
    );
}

export default AuthLayout;
