import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ForcePasswordChangeModal } from './ForcePasswordChangeModal';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export function Layout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout">
      <ForcePasswordChangeModal />
      <Sidebar />
      <div className="layout-main">
        <Header />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
