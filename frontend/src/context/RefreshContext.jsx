import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const RefreshContext = createContext();

export function RefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    // Dispatch a native window event so any non-react or outside listeners can also react
    window.dispatchEvent(new CustomEvent('app:data-changed'));
  }, []);

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) {
    // Fallback if used outside provider
    return {
      refreshKey: 0,
      triggerRefresh: () => window.dispatchEvent(new CustomEvent('app:data-changed'))
    };
  }
  return context;
}

// Custom hook to automatically trigger a fetch callback when refresh is requested or on window focus
export function useAutoRefresh(fetchCallback, options = {}) {
  const { refreshKey } = useRefresh();
  const { intervalMs = null, enableWindowFocus = true } = options;

  useEffect(() => {
    if (fetchCallback && typeof fetchCallback === 'function') {
      fetchCallback();
    }
  }, [refreshKey, fetchCallback]);

  // Listen to custom window event as additional safety
  useEffect(() => {
    const handleDataChanged = () => {
      if (fetchCallback && typeof fetchCallback === 'function') {
        fetchCallback();
      }
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => window.removeEventListener('app:data-changed', handleDataChanged);
  }, [fetchCallback]);

  // Periodic auto-refresh polling if intervalMs specified
  useEffect(() => {
    if (!intervalMs) return;
    const interval = setInterval(() => {
      if (fetchCallback && typeof fetchCallback === 'function') {
        fetchCallback();
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, fetchCallback]);

  // Window focus auto-refresh
  useEffect(() => {
    if (!enableWindowFocus) return;
    const handleFocus = () => {
      if (fetchCallback && typeof fetchCallback === 'function') {
        fetchCallback();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enableWindowFocus, fetchCallback]);
}
