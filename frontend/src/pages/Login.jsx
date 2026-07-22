import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box } from 'lucide-react';
import api from '../utils/api';
import './Login.css';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', { email: username, password });
      login(response.token, {
        name: response.email,
        role: response.role,
        userId: response.userId,
        passwordChangeRequired: response.passwordChangeRequired
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Invalid credentials or server error.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setForgotMessage('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMessage(res || 'Temp password delivered by email');
    } catch (err) {
      setError(err?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div>
          <h1 className="project-title">ZENCUBE ACCESS-TRACK</h1>
          <div className="project-subtitle">OFFICE ACCESS & ATTENDANCE SYSTEM</div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <Box size={32} color="var(--color-primary)" />
            </div>
            <h2>Sign In</h2>
            <p className="text-muted">Enter your credentials to access the portal</p>
          </div>

          {error && <div className="login-error">{error}</div>}
          {forgotMessage && <div className="login-error" style={{ background: 'var(--color-success-light, #d4edda)', color: 'var(--color-success, #155724)', border: '1px solid var(--color-success, #c3e6cb)' }}>{forgotMessage}</div>}

          {!showForgotPassword ? (
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setShowForgotPassword(true); setError(''); setForgotMessage(''); }} 
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="forgotEmail">Email Address</label>
                <input
                  id="forgotEmail"
                  type="email"
                  className="form-control"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                {loading ? 'Requesting...' : 'Reset Password'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowForgotPassword(false); setError(''); setForgotMessage(''); }} 
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
