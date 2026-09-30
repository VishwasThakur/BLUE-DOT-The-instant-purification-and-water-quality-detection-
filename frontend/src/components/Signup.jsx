import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Signup = ({ onSwitchToLogin }) => {
  const { signup, login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in every field.');
      return;
    }

    try {
      setLoading(true);
      await signup(name, email, password);
      // Auto login after successful signup
      await login(email, password, true);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <div className="auth-card" id="signupCard">
            <h2>Create your vault</h2>
            <p className="auth-sub">Set up an account to get started</p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="signupName">Full name</label>
              <input
                type="text"
                id="signupName"
                required
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label htmlFor="signupEmail">Email</label>
              <input
                type="email"
                id="signupEmail"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="signupPassword">Password</label>
              <input
                type="password"
                id="signupPassword"
                required
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '20px' }}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            <p className="auth-switch">
              Already have an account?{' '}
              <button type="button" onClick={onSwitchToLogin} style={{ color: 'var(--accent-dark)', fontWeight: 600 }}>
                Log in
              </button>
            </p>
            {error && <p className="auth-error" id="signupError">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
