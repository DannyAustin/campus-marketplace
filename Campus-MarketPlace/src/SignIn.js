import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function SignIn({ onSignIn }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSignIn = async (e) => {
        e.preventDefault();
        const userData = { username, password };

        try {
            const response = await fetch('http://localhost:8080/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            localStorage.setItem('userId', data.user_id);
            onSignIn();
            navigate('/home');
        } catch (error) {
            alert('Invalid username or password');
        }
    };

    const handleSignUpRedirect = () => navigate('/signup');

    return (
        <div className="signin-page">
            <div className="welcome-text-container">
                <h2>Welcome to Campus MarketPlacet</h2>
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
                    <a onClick={handleSignUpRedirect} className="SignUpButton">
                        New User? Register
                    </a>
                </div>
            </div>
        </div>
    );
}

export default SignIn;
