import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAutoRefresh } from '../context/RefreshContext';
import { ZenvPlusIcon, ZenvQuantumShieldIcon, ZenvTrashIcon } from '../components/ZenvIcons';

export function StaffUsers() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', role: 'OPERATOR' });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get('/users');
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch staff users');
    }
  }, [toast]);

  useAutoRefresh(fetchUsers, { intervalMs: 10000 });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const data = await api.post('/users', newUser);
      setTempPassword(data.tempPassword);
      setNewUser({ email: '', role: 'OPERATOR' });
      toast.success('Staff user created successfully!');
      fetchUsers();
    } catch (err) {
      toast.error(err?.message || 'Failed to create staff user');
    }
  };

  const toggleUserActive = async (id, currentStatus) => {
    try {
      await api.patch(`/users/${id}`, { active: !currentStatus });
      toast.success(`User status changed to ${!currentStatus ? 'Active' : 'Inactive'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err?.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (id, email) => {
    if (!window.confirm(`Are you sure you want to reset the password for ${email}? It will be reset to their email address.`)) return;
    try {
      await api.patch(`/users/${id}`, { resetPassword: true });
      toast.success(`Password successfully reset for ${email}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to reset password');
    }
  };

  const deleteUser = async (id, email) => {
    if (user?.role !== 'ADMIN') return toast.warning("Only Admins can delete users.");
    if (!window.confirm(`Are you sure you want to permanently delete user ${email}?`)) return;
    
    try {
      await api.delete(`/users/${id}`);
      toast.success(`User ${email} deleted successfully`);
      fetchUsers();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Staff Users</h1>
          <p className="text-muted">Manage staff access and roles.</p>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Staff Access Management</h3>
          <button className="btn btn-primary" onClick={() => setShowNewUserForm(!showNewUserForm)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ZenvPlusIcon size={16} /> Add Staff User
          </button>
        </div>
        
        {showNewUserForm && (
          <div className="card" style={{ marginBottom: '2rem', background: 'var(--color-bg-subtle)' }}>
            <h4>Create New User</h4>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <select className="form-control" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="OPERATOR">Operator</option>
                  {user?.role === 'ADMIN' && <option value="MANAGER">Manager</option>}
                  {user?.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Create</button>
            </form>
            
            {tempPassword && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ZenvQuantumShieldIcon size={20} />
                <div>
                  <strong>Important:</strong> User created successfully. Their temporary password is <code>{tempPassword}</code>. They must change it upon login.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId}>
                  <td className="font-medium">#{u.userId}</td>
                  <td>
                    {u.personId ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ 
                          fontFamily: 'monospace',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          background: '#f1f5f9',
                          color: '#0f172a',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}>
                          {u.personExternalRef || `EXT-${String(u.personId).padStart(4, '0')}`}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Person #{u.personId} ({u.personName})
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>-</span>
                    )}
                  </td>
                  <td className="font-medium">{u.email}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'MANAGER' ? 'badge-primary' : 'badge-success'}`}>{u.role}</span></td>
                  <td>
                    <span style={{ color: u.active ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    {user?.role === 'ADMIN' && u.userId !== user.userId && (
                      <div className="action-buttons">
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => toggleUserActive(u.userId, u.active)}
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          className="btn btn-warning" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#000' }}
                          onClick={() => handleResetPassword(u.userId, u.email)}
                        >
                          Reset Password
                        </button>
                        <button 
                          className="icon-btn-small text-danger" 
                          style={{ padding: '0.25rem 0.5rem', marginLeft: '0.5rem' }}
                          title="Delete User"
                          onClick={() => deleteUser(u.userId, u.email)}
                        >
                          <ZenvTrashIcon size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
