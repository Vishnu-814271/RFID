import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

export function ForcePasswordChangeModal() {
  const { user, login } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
          <div style={{ display: 'inline-flex', background: 'var(--color-primary-light)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Lock size={32} color="white" />
          </div>
          <h2 className="modal-title">Action Required</h2>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            For security reasons, you must change your password on your first login.
          </p>
        </div>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
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
