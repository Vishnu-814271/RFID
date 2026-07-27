import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  
  // Config state
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await api.get('/config');
      // workingDays is returned as comma separated string
      setConfig(data);
    } catch (err) {
      console.error(err);
      toast.error(`Error loading config: ${err.message || 'Server error'}`);
    } finally {
      setConfigLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      fetchConfig();
    }
  }, [user?.role, fetchConfig]);

  const saveConfig = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    setSaveStatus(null);
    try {
      await api.patch('/config', {
        expectedStartTime: config.expectedStartTime,
        lateGraceMinutes: parseInt(config.lateGraceMinutes),
        autoCheckoutTime: config.autoCheckoutTime,
        workingDays: config.workingDays, // Backend expects a string, not an array
        tapDebounceSeconds: parseInt(config.tapDebounceSeconds),
        sessionTimeoutMinutes: parseInt(config.sessionTimeoutMinutes),
        minWorkingMinutes: parseInt(config.minWorkingMinutes),
        overnightSessionAttribution: config.overnightSessionAttribution
      });
      const msg = 'Configuration saved successfully!';
      setSaveStatus({ type: 'success', message: msg });
      toast.success(msg);
    } catch (err) {
      const errMsg = `Error saving config: ${err.message || err.error || JSON.stringify(err)}`;
      setSaveStatus({ type: 'error', message: errMsg });
      toast.error(errMsg);
    } finally {
      setConfigLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  const handlePurgeData = async () => {
    if (!window.confirm("WARNING: This will permanently delete all test people, RFID cards, card mappings, attendance sessions, tap events, and notifications.\n\nStaff users and system configurations will NOT be deleted.\n\nAre you sure you want to proceed?")) {
      return;
    }
    setConfigLoading(true);
    setSaveStatus(null);
    try {
      const res = await api.post('/config/purge-test-data');
      const msg = typeof res === 'string' ? res : 'All test data purged successfully!';
      setSaveStatus({ type: 'success', message: msg });
      toast.success(msg);
    } catch (err) {
      const errMsg = `Error purging data: ${err.message || err.error || JSON.stringify(err)}`;
      setSaveStatus({ type: 'error', message: errMsg });
      toast.error(errMsg);
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>System Settings</h1>
          <p className="text-muted">Manage system configuration.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h3>Attendance Parameters</h3>

        {saveStatus && (
          <div className={`status-banner status-${saveStatus.type}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.1rem',
            borderRadius: '10px',
            marginTop: '1rem',
            fontSize: '0.9rem',
            fontWeight: '500',
            background: saveStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: saveStatus.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${saveStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            {saveStatus.type === 'success' ? <CheckCircle size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
            <span>{saveStatus.message}</span>
          </div>
        )}

        {configLoading && !config ? <p style={{ marginTop: '1rem' }}>Loading...</p> : config && (
          <form onSubmit={saveConfig} style={{ marginTop: '1.5rem' }}>
            <fieldset disabled={!isAdmin} style={{ border: 'none', padding: 0, margin: 0 }}>
            <div className="form-group">
              <label className="form-label">Expected Start Time (HH:mm)</label>
              <input type="time" className="form-control" value={config.expectedStartTime} onChange={e => setConfig({...config, expectedStartTime: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Late Grace Period (minutes)</label>
              <input type="number" className="form-control" value={config.lateGraceMinutes} onChange={e => setConfig({...config, lateGraceMinutes: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Auto Checkout Time (HH:mm)</label>
              <input type="time" className="form-control" value={config.autoCheckoutTime} onChange={e => setConfig({...config, autoCheckoutTime: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Working Days (comma separated)</label>
              <input type="text" className="form-control" value={config.workingDays} onChange={e => setConfig({...config, workingDays: e.target.value})} placeholder="MON,TUE,WED,THU,FRI" required />
            </div>
            <div className="form-group">
              <label className="form-label">Tap Debounce (seconds)</label>
              <input type="number" className="form-control" value={config.tapDebounceSeconds} onChange={e => setConfig({...config, tapDebounceSeconds: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Session Idle Timeout (minutes)</label>
              <input type="number" className="form-control" value={config.sessionTimeoutMinutes || 5} onChange={e => setConfig({...config, sessionTimeoutMinutes: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Working Hours (minutes)</label>
              <input type="number" className="form-control" value={config.minWorkingMinutes || 480} onChange={e => setConfig({...config, minWorkingMinutes: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Overnight Session Attribution</label>
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${(config.overnightSessionAttribution || 'false') === 'true' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '120px', padding: '0.6rem 1.2rem', fontWeight: 600 }}
                  onClick={() => {
                    const nextVal = (config.overnightSessionAttribution || 'false') === 'true' ? 'false' : 'true';
                    setConfig({...config, overnightSessionAttribution: nextVal});
                  }}
                >
                  {(config.overnightSessionAttribution || 'false') === 'true' ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            </fieldset>
            {isAdmin && (
              <button type="submit" className="btn btn-primary" disabled={configLoading} style={{ marginTop: '1rem' }}>
                <Save size={16} /> Save Configuration
              </button>
            )}
          </form>
        )}
      </div>

      {isAdmin && (
        <div className="card" style={{ maxWidth: '600px', marginTop: '1.5rem', borderColor: '#f87171' }}>
          <h3 style={{ color: '#ef4444' }}>Database Maintenance</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Purge all test/operational data including People, RFID Cards, Card Mappings, Attendance Sessions, Tap Logs, and Notifications. Staff accounts and system configurations will be preserved.
          </p>
          <button
            type="button"
            className="btn"
            style={{ backgroundColor: '#ef4444', color: '#fff', marginTop: '1rem', gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}
            disabled={configLoading}
            onClick={handlePurgeData}
          >
            <Trash2 size={16} /> Purge System Test Data
          </button>
        </div>
      )}
    </div>
  );
}
