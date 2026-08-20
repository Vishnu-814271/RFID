import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Activity, FileText, Settings, ShieldAlert, UserCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ZenvLogo } from './ZenvLogo';
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
    { name: 'Access Logs', path: '/access-logs', icon: <ShieldAlert size={20} />, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
    { name: 'Audit Logs', path: '/audit', icon: <ShieldAlert size={20} />, roles: ['ADMIN'] },
    { name: 'Staff Users', path: '/staff-users', icon: <UserCog size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} />, roles: ['ADMIN', 'MANAGER'] },
  ].filter(item => item.roles.includes(user?.role));

  return (
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
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">{(user?.name || user?.email)?.charAt(0).toUpperCase() || 'U'}</div>
          <div className="details">
            <span className="name">{user?.name || user?.email || 'User'}</span>
            <span className="role">{user?.role || 'Staff'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

