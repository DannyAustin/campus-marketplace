import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthContext } from '../context/AuthContext';

function SignInPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { login } = useAuthContext();

    const handleSignIn = async (e) => {
        e.preventDefault();
        try {
            const response = await api.login({ username, password });
            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            login(data.user_id);
            navigate('/home');
        } catch (error) {
            alert('Invalid username or password');
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
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button type="submit">Login</button>
                    </form>
                    <button 
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