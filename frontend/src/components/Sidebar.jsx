import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Activity, FileText, Settings, ShieldAlert, UserCog, Box } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'Live Attendance', path: '/live', icon: <Activity size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'People', path: '/people', icon: <Users size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'Cards', path: '/cards', icon: <CreditCard size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'Reports', path: '/reports', icon: <FileText size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Audit Logs', path: '/audit', icon: <ShieldAlert size={20} />, roles: ['ADMIN'] },
    { name: 'Staff Users', path: '/staff-users', icon: <UserCog size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} />, roles: ['ADMIN', 'MANAGER'] },
  ].filter(item => item.roles.includes(user?.role));

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Box size={24} color="var(--color-primary)" />
        <h2>ZENCUBE</h2>
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
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">{user?.name?.charAt(0) || 'U'}</div>
          <div className="details">
            <span className="name">{user?.name || 'Admin User'}</span>
            <span className="role">{user?.role || 'Administrator'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
