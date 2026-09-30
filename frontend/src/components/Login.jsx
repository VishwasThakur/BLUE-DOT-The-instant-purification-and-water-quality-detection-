import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Signup from './Signup';

const Login = () => {
  const { login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSignup) {
    return <Signup onSwitchToLogin={() => setIsSignup(false)} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in every field.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password, remember);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotClick = (e) => {
    e.preventDefault();
    setError('Password reset will be available once the backend is connected.');
  };

  return (
    <div className="auth-body">
      <div className="auth-wrap">
        <div className="auth-brand">
          <div className="brand-dots"></div>
          <div className="brand-mark">V</div>
          <h1>VaultAI</h1>
          <p>Your documents, organized and within reach.</p>
          <ul className="brand-points">
            <li><span className="point-dot"></span>Upload anything, find it in seconds</li>
            <li><span className="point-dot"></span>Folders that actually make sense</li>
            <li><span className="point-dot"></span>AI assistance built in, coming soon</li>
          </ul>
        </div>

        <div className="auth-panel">
          <div className="auth-card" id="loginCard">
            <h2>Welcome back</h2>
            <p className="auth-sub">Log in to open your vault</p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="loginEmail">Email</label>
              <input
                type="email"
                id="loginEmail"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="loginPassword">Password</label>
              <input
                type="password"
                id="loginPassword"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="auth-row">
                <label className="remember">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <a href="#" className="auth-link" id="forgotLink" onClick={handleForgotClick}>
                  Forgot password?
                </a>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
            <p className="auth-switch">
              New to VaultAI?{' '}
              <button type="button" onClick={() => setIsSignup(true)} style={{ color: 'var(--accent-dark)', fontWeight: 600 }}>
                Create an account
              </button>
            </p>
            {error && <p className="auth-error" id="loginError">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
