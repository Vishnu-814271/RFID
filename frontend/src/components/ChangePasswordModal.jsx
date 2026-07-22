import React, { useState } from 'react';
import api from '../utils/api';
import { Lock, X } from 'lucide-react';

export function ChangePasswordModal({ onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
      setSuccess('Password changed successfully');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', zIndex: 9999 }}>
      <div className="modal" style={{ position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
        >
          <X size={20} />
        </button>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', background: 'var(--color-primary-light)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Lock size={32} color="white" />
          </div>
          <h2 className="modal-title">Change Password</h2>
        </div>
        
        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-error" style={{ background: 'var(--color-success)', color: 'white', border: 'none' }}>{success}</div>}
        
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
