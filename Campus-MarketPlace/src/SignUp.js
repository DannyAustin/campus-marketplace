import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function SignUp({ onSignUp }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:8080/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();

        const userId = data.user_id;
        localStorage.setItem('userId', userId);

        setMessage('Sign-up successful! Redirecting to home...');
        setUsername('');
        setPassword('');

        onSignUp();
        navigate('/home');
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Sign-up failed. Try again.');
      }
    } catch (error) {
      console.error('Error during sign-up:', error);
      console.log(error);
      setMessage('Username already exists.');
    }
  };

  const handleSignInRedirect = () => {
    navigate('/signin');
  };

  return (
    <div className="signup-page">
      <div className="welcome-text-container">
        <h2>Welcome to Campus MarketPlace</h2>
        <p>
          Sell ANYTHING to your peers!
        </p>
      </div>
      <div className="signup-container">
        <div className="background-overlay"></div>
        <div className="SignUp">
          <h3>Create an Account</h3>
          <form onSubmit={handleSignUp}>
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
            <button type="submit">Sign Up</button>
          </form>
          <button onClick={handleSignInRedirect} className="SignInButton">
            Already have an account? Sign In
          </button>
          {message && <p className="signup-message">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default SignUp;
