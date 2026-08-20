import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Bell, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { useAutoRefresh } from '../context/RefreshContext';
import { formatDateTime } from '../utils/dateUtils';
import { ChangePasswordModal } from './ChangePasswordModal';
import './Header.css';

export function Header() {
  const { logout, user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [user?.role]);

  useAutoRefresh(fetchNotifications, { intervalMs: 10000 });

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="header" style={{ position: 'relative' }}>
      <div className="header-left">
      </div>

      <div className="header-center" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontFamily: 'var(--font-family-display, var(--font-family))', fontWeight: '700', fontSize: '1.5rem', color: 'var(--color-primary-light)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
          Rftrack Access & Attendance Track
        </span>
      </div>

      <div className="header-right" style={{ marginLeft: 'auto' }}>
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-dot"></span>}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute', right: 0, top: '100%',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '2px', width: '320px',
                maxHeight: '400px', overflowY: 'auto',
                zIndex: 1000, boxShadow: 'var(--shadow-lg)'
              }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold' }}>
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: n.read ? 'transparent' : 'rgba(16, 43, 76, 0.05)',
                        cursor: n.read ? 'default' : 'pointer'
                      }}
                      onClick={() => !n.read && markAsRead(n.id)}
                    >
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)' }}>{n.message}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        {formatDateTime(n.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        <div className="header-divider"></div>
        <button className="btn btn-secondary" onClick={() => setShowChangePassword(true)} style={{ padding: '0.5rem' }} title="Change Password">
          <Lock size={16} />
        </button>
        <button className="btn btn-secondary btn-logout" onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </header>
  );
}
