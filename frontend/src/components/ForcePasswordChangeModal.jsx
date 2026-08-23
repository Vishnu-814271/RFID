import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ZenvKeyIcon } from './ZenvIcons';
import { Eye, EyeOff } from 'lucide-react';

export function ForcePasswordChangeModal() {
  const { user, login } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user?.passwordChangeRequired) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
      // Update the auth context so the modal disappears
      login(localStorage.getItem('token'), { ...user, passwordChangeRequired: false });
    } catch (err) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', zIndex: 9999 }}>
      <div className="modal">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', background: 'var(--color-primary-light)', padding: '0.85rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <ZenvKeyIcon size={32} color="white" />
          </div>
          <h2 className="modal-title">Action Required</h2>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            For security reasons, you must change your password on your first login.
          </p>
        </div>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Current / Temporary Password</label>
            <div className="password-input-wrapper" style={{ position: 'relative' }}>
              <input 
                type={showOldPassword ? "text" : "password"} 
                className="form-control" 
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowOldPassword(!showOldPassword)}
                aria-label={showOldPassword ? 'Hide password' : 'Show password'}
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="password-input-wrapper" style={{ position: 'relative' }}>
              <input 
                type={showNewPassword ? "text" : "password"} 
                className="form-control" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div className="password-input-wrapper" style={{ position: 'relative' }}>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                className="form-control" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="modal-actions" style={{ justifyContent: 'center' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
