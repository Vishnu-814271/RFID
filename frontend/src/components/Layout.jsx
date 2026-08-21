import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ForcePasswordChangeModal } from './ForcePasswordChangeModal';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export function Layout() {
  const { isAuthenticated } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <div className={`layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <ForcePasswordChangeModal />
      <Sidebar 
        isOpen={mobileSidebarOpen} 
        onClose={closeMobileSidebar} 
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      {mobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={closeMobileSidebar}
        />
      )}
      <div className="layout-main">
        <Header onToggleSidebar={toggleMobileSidebar} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
