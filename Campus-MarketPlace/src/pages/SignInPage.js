import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthContext } from '../context/AuthContext';
import StatusMessage from '../components/StatusMessage';
import AuthLayout from '../components/AuthLayout';
import { afterAuthPath } from '../utils/afterAuthPath';

function SignInPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = afterAuthPath(location.state);
    const { login } = useAuthContext();

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            login(await api.login({ username, password }));
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-card">
                <h2>Sign in</h2>
                <p className="muted">Welcome back — pick up where you left off.</p>
                <form onSubmit={handleSignIn}>
                    <div className="field">
                        <label htmlFor="signin-username">Username</label>
                        <input
                            id="signin-username"
                            className="input"
                            type="text"
                            placeholder="Username"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="signin-password">Password</label>
                        <input
                            id="signin-password"
                            className="input"
                            type="password"
                            placeholder="Password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
                <StatusMessage type="error">{error}</StatusMessage>
                <p className="auth-switch">
                    New here? <Link to="/signup" state={location.state}>Create an account</Link>
                </p>
            </div>
        </AuthLayout>
    );
}

export default SignInPage;
