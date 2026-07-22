import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const timeoutRef = useRef(null);
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

  useEffect(() => {
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
    };
    hydrateAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutMinutes = 5; // default fallback

    const fetchTimeoutConfig = async () => {
      try {
        const config = await api.get('/config');
        if (config.sessionTimeoutMinutes) {
          timeoutMinutes = parseInt(config.sessionTimeoutMinutes, 10);
        }
      } catch (err) {
        console.error("Failed to fetch session timeout config:", err);
      }
    };
    fetchTimeoutConfig();

    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - activityRef.current;
      if (idleTime >= timeoutMinutes * 60 * 1000) {
        console.log("Session timed out due to inactivity");
        logout();
      }
    }, 30000); // Check every 30 seconds

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetActivity));

    return () => {
      clearInterval(checkIdle);
      events.forEach(e => window.removeEventListener(e, resetActivity));
    };
  }, [isAuthenticated]);

  if (loading) {
    return <div className="loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading session...</div>;
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
