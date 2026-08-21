import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ZenvLogo } from './ZenvLogo';
import { ChangePasswordModal } from './ChangePasswordModal';
import { 
  ZenvDashboardIcon,
  ZenvRfidScanIcon, 
  ZenvIdCardIcon, 
  ZenvUsersIcon,
  ZenvReportIcon,
  ZenvQuantumShieldIcon, 
  ZenvAuditDocIcon, 
  ZenvHierarchyIcon,
  ZenvSettingsIcon,
  ZenvKeyIcon,
  ZenvLogoutIcon
} from './ZenvIcons';
import './Sidebar.css';

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const userMenuRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Close popup menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <ZenvDashboardIcon size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'Live Attendance', path: '/live', icon: <ZenvRfidScanIcon size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'People', path: '/people', icon: <ZenvUsersIcon size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'Cards', path: '/cards', icon: <ZenvIdCardIcon size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'Reports', path: '/reports', icon: <ZenvReportIcon size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Access Logs', path: '/access-logs', icon: <ZenvQuantumShieldIcon size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'Audit Logs', path: '/audit', icon: <ZenvAuditDocIcon size={20} />, roles: ['ADMIN'] },
    { name: 'Staff Users', path: '/staff-users', icon: <ZenvHierarchyIcon size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Settings', path: '/settings', icon: <ZenvSettingsIcon size={20} />, roles: ['ADMIN', 'MANAGER'] },
  ].filter(item => item.roles.includes(user?.role));

  const userDisplayName = user?.name || user?.email || 'admin@zencube.com';
  const initial = userDisplayName.charAt(0).toUpperCase();

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <ZenvLogo variant="white" size="md" subtext="QUANTUM" />
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  <span className="sidebar-text">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer with Popup Menu for Change Password & Logout */}
        <div className="sidebar-footer" ref={userMenuRef}>
          {showUserMenu && (
            <div className="sidebar-user-popup">
              <button
                className="popup-item"
                onClick={() => {
                  setShowUserMenu(false);
                  setShowChangePassword(true);
                }}
              >
                <ZenvKeyIcon size={16} className="popup-icon" />
                <span>Change Password</span>
              </button>

              <button
                className="popup-item popup-logout"
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
              >
                <ZenvLogoutIcon size={16} className="popup-icon" />
                <span>Logout</span>
              </button>
            </div>
          )}

          <button 
            type="button"
            className={`user-info-btn ${showUserMenu ? 'active' : ''}`}
            onClick={() => setShowUserMenu(prev => !prev)}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <div className="avatar">{initial}</div>
            <div className="details">
              <span className="name" title={userDisplayName}>{userDisplayName}</span>
              <span className="role">{user?.role || 'Staff'}</span>
            </div>
            <ChevronUp size={16} className={`footer-chevron ${showUserMenu ? 'rotated' : ''}`} />
          </button>
        </div>
      </aside>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
}

