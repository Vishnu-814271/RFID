import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ZenvBellIcon } from './ZenvIcons';
import api from '../utils/api';
import { useAutoRefresh } from '../context/RefreshContext';
import { formatDateTime } from '../utils/dateUtils';
import './Header.css';

export function Header({ onToggleSidebar }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifMenuRef = useRef(null);

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

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="header">
      <div className="header-left">
        <button 
          className="mobile-menu-btn" 
          aria-label="Toggle Navigation Menu" 
          onClick={onToggleSidebar}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="header-right">
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <div style={{ position: 'relative' }} ref={notifMenuRef}>
            <button className="icon-btn" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
              <ZenvBellIcon size={20} />
              {unreadCount > 0 && <span className="notification-dot"></span>}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                backgroundColor: 'var(--color-bg-surface)',
                border: 'none',
                borderRadius: '6px',
                width: 'min(340px, calc(100vw - 2rem))',
                maxHeight: '400px', overflowY: 'auto',
                zIndex: 1000, boxShadow: '0 14px 36px rgba(16, 43, 76, 0.18), 0 3px 10px rgba(16, 43, 76, 0.08)'
              }}>
                <div style={{ padding: '1rem', borderBottom: 'none', boxShadow: '0 2px 6px rgba(16, 43, 76, 0.05)', fontWeight: 'bold' }}>
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
                        borderBottom: 'none',
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
      </div>
    </header>
  );
}
