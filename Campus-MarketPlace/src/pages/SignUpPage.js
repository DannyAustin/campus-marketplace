import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthContext } from '../context/AuthContext';
import StatusMessage from '../components/StatusMessage';
import AuthLayout from '../components/AuthLayout';
import { afterAuthPath } from '../utils/afterAuthPath';

function SignUpPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = afterAuthPath(location.state);
    const { login } = useAuthContext();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            // Registering signs the new user straight in.
            login(await api.register({ username: username.trim(), password }));
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-card">
                <h2>Create your account</h2>
                <p className="muted">It takes ten seconds — no email needed.</p>
                <form onSubmit={handleSignUp}>
                    <div className="field">
                        <label htmlFor="signup-username">Username</label>
                        <input
                            id="signup-username"
                            className="input"
                            type="text"
                            placeholder="Username"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            minLength={3}
                            maxLength={32}
                            pattern="[A-Za-z0-9_.\-]+"
                            title="3-32 characters: letters, numbers, '.', '_' or '-'"
                            aria-describedby="signup-username-hint"
                        />
                        <span className="field__hint" id="signup-username-hint">3–32 characters: letters, numbers, dots, underscores or dashes.</span>
                    </div>
                    <div className="field">
                        <label htmlFor="signup-password">Password</label>
                        <input
                            id="signup-password"
                            className="input"
                            type="password"
                            placeholder="Password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            maxLength={72}
                            aria-describedby="signup-password-hint"
                        />
                        <span className="field__hint" id="signup-password-hint">At least 8 characters.</span>
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
                        {submitting ? 'Creating account…' : 'Create account'}
                    </button>
                </form>
                <StatusMessage type="error">{error}</StatusMessage>
                <p className="auth-switch">
                    Already have an account? <Link to="/signin" state={location.state}>Sign in</Link>
                </p>
            </div>
        </AuthLayout>
    );
}

export default SignUpPage;
