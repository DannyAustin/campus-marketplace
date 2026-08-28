import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthContext } from '../context/AuthContext';
import StatusMessage from '../components/StatusMessage';

function SignUpPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuthContext();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            // Registering signs the new user straight in.
            login(await api.register({ username: username.trim(), password }));
            navigate('/home');
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <div className="signup-page">
            <div className="welcome-text-container">
                <h2>Welcome to Campus MarketPlace</h2>
                <p>Sell ANYTHING to your peers!</p>
            </div>
            <div className="signup-container">
                <div className="background-overlay"></div>
                <div className="SignUp">
                    <h3>Create an Account</h3>
                    <form onSubmit={handleSignUp}>
                        <input
                            type="text"
                            placeholder="Username (3-32 letters, numbers, . _ -)"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            minLength={3}
                            maxLength={32}
                            pattern="[A-Za-z0-9_.\-]+"
                            title="3-32 characters: letters, numbers, '.', '_' or '-'"
                        />
                        <input
                            type="password"
                            placeholder="Password (at least 8 characters)"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            maxLength={72}
                        />
                        <button type="submit" disabled={submitting}>
                            {submitting ? 'Creating account…' : 'Sign Up'}
                        </button>
                    </form>
                    <StatusMessage type="error">{error}</StatusMessage>
                    <button type="button" onClick={() => navigate('/signin')} className="SignInButton">
                        Already have an account? Sign In
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SignUpPage;
