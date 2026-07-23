import React, { useState, useEffect } from 'react';
import { LogOut, Bell, Search, Rss, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatDateTime } from '../utils/dateUtils';
import { ChangePasswordModal } from './ChangePasswordModal';
import './Header.css';

export function Header() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [cardUidIn, setCardUidIn] = useState('');
  const [isTappingIn, setIsTappingIn] = useState(false);
  const [tapResultIn, setTapResultIn] = useState('');

  const [cardUidOut, setCardUidOut] = useState('');
  const [isTappingOut, setIsTappingOut] = useState(false);
  const [tapResultOut, setTapResultOut] = useState('');

  const [showChangePassword, setShowChangePassword] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // poll every 10s
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleTapSubmit = async (e, uid, readerId, setUid, setIsTapping, setRes) => {
    e.preventDefault();
    setIsTapping(true);
    setRes('');
    try {
      const res = await api.post('/taps', { cardUid: uid, readerId }, {
        headers: { 'X-Device-Key': 'ZEN_DEVICE_SECRET_KEY' }
      });
      setRes(`Success: ${res.decision}`);
      setUid('');
      setTimeout(() => setRes(''), 3000);
    } catch (err) {
      setRes(`Error: ${err?.message || err?.error || 'Failed'}`);
    } finally {
      setIsTapping(false);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <form className="tap-simulator" onSubmit={(e) => handleTapSubmit(e, cardUidIn, 'READER_IN', setCardUidIn, setIsTappingIn, setTapResultIn)}>
          <Rss size={18} className="search-icon text-muted" style={{ color: 'var(--color-success)' }} />
          <input
            type="text"
            placeholder="Entrance (In) Card UID"
            className="search-input"
            style={{ width: '180px' }}
            value={cardUidIn}
            onChange={(e) => setCardUidIn(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} disabled={isTappingIn}>
            {isTappingIn ? '...' : 'Tap In'}
          </button>
        </form>
        {tapResultIn && (
          <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: tapResultIn.includes('DENIED') || tapResultIn.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {tapResultIn}
          </span>
        )}
      </div>
      <div className="header-right">
        {tapResultOut && (
          <span style={{ marginRight: '1rem', fontSize: '0.85rem', color: tapResultOut.includes('DENIED') || tapResultOut.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {tapResultOut}
          </span>
        )}
        <form className="tap-simulator" onSubmit={(e) => handleTapSubmit(e, cardUidOut, 'READER_OUT', setCardUidOut, setIsTappingOut, setTapResultOut)} style={{ marginRight: '1rem' }}>
          <Rss size={18} className="search-icon text-muted" style={{ color: 'var(--color-warning)' }} />
          <input
            type="text"
            placeholder="Exit (Out) Card UID"
            className="search-input"
            style={{ width: '180px' }}
            value={cardUidOut}
            onChange={(e) => setCardUidOut(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-warning" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#000' }} disabled={isTappingOut}>
            {isTappingOut ? '...' : 'Tap Out'}
          </button>
        </form>
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
                borderRadius: '8px', width: '300px',
                maxHeight: '400px', overflowY: 'auto',
                zIndex: 1000, boxShadow: 'var(--shadow-md)'
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
                        backgroundColor: n.read ? 'transparent' : 'rgba(15, 58, 104, 0.05)',
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
        <button className="btn btn-secondary" onClick={() => setShowChangePassword(true)} style={{ marginRight: '1rem', padding: '0.5rem' }} title="Change Password">
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
