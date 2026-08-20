/* oxlint-disable react/only-export-components */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const activityRef = useRef(Date.now());

  const resetActivity = () => {
    activityRef.current = Date.now();
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setUser(userData);
    resetActivity();
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      console.error('Logout API failed:', e);
    }
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  const [showSlowNotice, setShowSlowNotice] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSlowNotice(true);
    }, 2000);

    const hydrateAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await api.get('/auth/me');
          setIsAuthenticated(true);
          setUser(userData);
          resetActivity();
        } catch (err) {
          console.error("Session expired or invalid:", err);
          logout();
        }
      }
      setLoading(false);
      clearTimeout(timer);
    };
    hydrateAuth();

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Fixed default: 7 days (7 * 24 * 60 * 60 * 1000 ms)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - activityRef.current;
      if (idleTime >= SEVEN_DAYS_MS) {
        console.log("Session timed out due to inactivity (7 days)");
        logout();
      }
    }, 60000); // Check every minute

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetActivity));

    return () => {
      clearInterval(checkIdle);
      events.forEach(e => window.removeEventListener(e, resetActivity));
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="loading-screen" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '1rem', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1.25rem' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.25rem' }}>Loading RFID.ZENCUBE</h3>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
          {showSlowNotice ? "⚡ Waking up backend server on Render... (This may take up to 20-30s on cold start)" : "Initializing session..."}
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
