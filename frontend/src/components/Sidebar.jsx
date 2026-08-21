import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ZenvLogo } from './ZenvLogo';
import zenvQuantumLogo from '../assets/zenv-quantum-logo.png';
import zenvLogoImg from '../assets/zenv-logo.png';
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

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
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
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Expand / Collapse Button Attached to Sidebar Right Vertical Edge Line */}
        {onToggleCollapse && (
          <button
            className="sidebar-edge-toggle-btn"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isCollapsed ? (
                <polyline points="9 18 15 12 9 6"></polyline>
              ) : (
                <polyline points="15 18 9 12 15 6"></polyline>
              )}
            </svg>
          </button>
        )}

        <div className="sidebar-header" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <div className="sidebar-logo-container">
            <img
              src={zenvQuantumLogo}
              alt="ZENV QUANTUM"
              className="sidebar-logo-full"
            />
            <img
              src={zenvLogoImg}
              alt="ZENV"
              className="sidebar-logo-mark"
            />
          </div>

          {onClose && (
            <button
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close Sidebar"
              style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}
            >
              ✕
            </button>
          )}
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                  title={isCollapsed ? item.name : undefined}
                  onClick={() => {
                    if (onClose) onClose();
                  }}
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

