import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthContext } from '../context/AuthContext';
import StatusMessage from '../components/StatusMessage';

function SignInPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuthContext();

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            login(await api.login({ username, password }));
            navigate('/home');
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <div className="signin-page">
            <div className="welcome-text-container">
                <h2>Welcome to Campus Marketplace</h2>
                <p>Sell ANYTHING to your peers!</p>
            </div>
            <div className="signin-container">
                <div className="background-overlay"></div>
                <div className="SignIn">
                    <h3>Login</h3>
                    <form onSubmit={handleSignIn}>
                        <input
                            type="text"
                            placeholder="Username"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={submitting}>
                            {submitting ? 'Signing in…' : 'Login'}
                        </button>
                    </form>
                    <StatusMessage type="error">{error}</StatusMessage>
                    <button
                        type="button"
                        onClick={() => navigate('/signup')}
                        className="SignUpButton"
                    >
                        New User? Register
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SignInPage;
