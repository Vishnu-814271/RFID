import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';
import zenvQuantumLogo from '../assets/zenv-quantum-logo.png';
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
        email: response.email,
        role: response.role,
        userId: response.userId,
        passwordChangeRequired: response.passwordChangeRequired
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Invalid credentials or server connection failure.');
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
      setForgotMessage(res || 'Temporary password sent to registered email address.');
    } catch (err) {
      setError(err?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Brand Showcase Banner */}
      <div className="login-left">
        <div className="login-brand-content">
          <img 
            src={zenvQuantumLogo} 
            alt="ZENV QUANTUM" 
            className="login-hero-logo"
            style={{
              maxWidth: '420px',
              width: '85%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1) drop-shadow(0 8px 32px rgba(0, 0, 0, 0.5))',
              userSelect: 'none'
            }} 
          />
        </div>
      </div>

      {/* Right Authentication Card */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo-wrapper" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
              <img 
                src={zenvQuantumLogo} 
                alt="ZENV QUANTUM" 
                style={{
                  maxWidth: '230px',
                  width: '75%',
                  height: 'auto',
                  objectFit: 'contain',
                  userSelect: 'none'
                }} 
              />
            </div>
            <h2>{showForgotPassword ? 'Forgot Password' : 'SIGN IN'}</h2>
          </div>

          {error && <div className="login-error">{error}</div>}
          {forgotMessage && (
            <div className="login-success">
              {forgotMessage}
            </div>
          )}

          {!showForgotPassword ? (
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username / Email</label>
                <input
                  id="username"
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@zenv.ai"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setError(''); setForgotMessage(''); }}
                    className="forgot-link"
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                {loading ? (
                  <span>SIGN IN...</span>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="forgotEmail">Registered Staff Email</label>
                <input
                  id="forgotEmail"
                  type="email"
                  className="form-control"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="staff@zenv.ai"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                {loading ? 'Dispatching Token...' : 'Send Password'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setError(''); setForgotMessage(''); }}
                  className="back-link"
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}

          <div className="login-card-footer">

          </div>
        </div>
      </div>
    </div>
  );
}
