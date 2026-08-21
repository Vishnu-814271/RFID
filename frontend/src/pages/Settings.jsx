import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRefresh, useAutoRefresh } from '../context/RefreshContext';
import { ZenvCheckIcon, ZenvAlertIcon, ZenvTrashIcon } from '../components/ZenvIcons';

export function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const { triggerRefresh } = useRefresh();
  
  // Config state
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [savingField, setSavingField] = useState(null);

  const fetchConfig = useCallback(async () => {
    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') return;
    try {
      const data = await api.get('/config');
      setConfig(data);
    } catch (err) {
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  }, [user?.role]);

  useAutoRefresh(fetchConfig);

  const fieldLabels = {
    expectedStartTime: 'Expected Start Time',
    lateGraceMinutes: 'Late Grace Period',
    autoCheckoutTime: 'Auto Checkout Time',
    workingDays: 'Working Days',
    tapDebounceSeconds: 'Tap Debounce',
    minWorkingMinutes: 'Minimum Working Hours',
    overnightSessionAttribution: 'Overnight Session Attribution',
    sessionTimeoutMinutes: 'Session Timeout'
  };

  const saveField = async (fieldKey, value) => {
    setSavingField(fieldKey);
    setSaveStatus(null);
    try {
      const payload = {};
      if (fieldKey === 'lateGraceMinutes' || fieldKey === 'tapDebounceSeconds' || fieldKey === 'sessionTimeoutMinutes' || fieldKey === 'minWorkingMinutes') {
        payload[fieldKey] = parseInt(value, 10);
      } else {
        payload[fieldKey] = value;
      }

      await api.patch('/config', payload);
      triggerRefresh();
      const msg = `${fieldLabels[fieldKey] || 'Configuration'} saved successfully!`;
      setSaveStatus({ type: 'success', message: msg });
      toast.success(msg);
    } catch (err) {
      const errMsg = `Error saving ${fieldLabels[fieldKey] || 'setting'}: ${err.message || err.error || JSON.stringify(err)}`;
      setSaveStatus({ type: 'error', message: errMsg });
      toast.error(errMsg);
    } finally {
      setSavingField(null);
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
          <p className="text-muted">Manage system parameters. Changes can be saved individually per configuration.</p>
        </div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '1100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0 }}>Attendance Parameters</h3>
        </div>

        {saveStatus && (
          <div className={`status-banner status-${saveStatus.type}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            fontWeight: '500',
            background: saveStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: saveStatus.type === 'success' ? '#065f46' : '#991b1b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {saveStatus.type === 'success' ? <ZenvCheckIcon size={18} color="#10b981" /> : <ZenvAlertIcon size={18} color="#ef4444" />}
            <span>{saveStatus.message}</span>
          </div>
        )}

        {configLoading && !config ? (
          <p style={{ marginTop: '1rem' }}>Loading configurations...</p>
        ) : config && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <fieldset disabled={!isAdmin} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Line 1: Expected Start Time, Late Grace Period, Auto Checkout Time */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* 1. Expected Start Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Expected Start Time (HH:mm)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={config.expectedStartTime || '09:30'} 
                      onChange={e => setConfig({ ...config, expectedStartTime: e.target.value })} 
                      required 
                    />
                    {isAdmin && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        disabled={savingField === 'expectedStartTime'}
                        onClick={() => saveField('expectedStartTime', config.expectedStartTime)}
                        style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        {savingField === 'expectedStartTime' ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Late Grace Period */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Late Grace Period (minutes)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={config.lateGraceMinutes ?? 15} 
                      onChange={e => setConfig({ ...config, lateGraceMinutes: e.target.value })} 
                      required 
                    />
                    {isAdmin && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        disabled={savingField === 'lateGraceMinutes'}
                        onClick={() => saveField('lateGraceMinutes', config.lateGraceMinutes)}
                        style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        {savingField === 'lateGraceMinutes' ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Auto Checkout Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Auto Checkout Time (HH:mm)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={config.autoCheckoutTime || '20:00'} 
                      onChange={e => setConfig({ ...config, autoCheckoutTime: e.target.value })} 
                      required 
                    />
                    {isAdmin && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        disabled={savingField === 'autoCheckoutTime'}
                        onClick={() => saveField('autoCheckoutTime', config.autoCheckoutTime)}
                        style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        {savingField === 'autoCheckoutTime' ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Line 2: Working Days, Tap Debounce, Minimum Working Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* 4. Working Days */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Working Days (comma separated)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={config.workingDays || 'MON,TUE,WED,THU,FRI'} 
                      onChange={e => setConfig({ ...config, workingDays: e.target.value })} 
                      placeholder="MON,TUE,WED,THU,FRI" 
                      required 
                    />
                    {isAdmin && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        disabled={savingField === 'workingDays'}
                        onClick={() => saveField('workingDays', config.workingDays)}
                        style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        {savingField === 'workingDays' ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 5. Tap Debounce */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tap Debounce (seconds)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={config.tapDebounceSeconds ?? 10} 
                      onChange={e => setConfig({ ...config, tapDebounceSeconds: e.target.value })} 
                      required 
                    />
                    {isAdmin && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        disabled={savingField === 'tapDebounceSeconds'}
                        onClick={() => saveField('tapDebounceSeconds', config.tapDebounceSeconds)}
                        style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        {savingField === 'tapDebounceSeconds' ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 6. Minimum Working Hours */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Minimum Working Hours</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      max="24"
                      className="form-control" 
                      value={Number(config.minWorkingMinutes !== undefined ? (config.minWorkingMinutes / 60) : 8).toFixed(2)} 
                      onChange={e => {
                        const hrs = parseFloat(e.target.value) || 0;
                        setConfig({ ...config, minWorkingMinutes: Math.round(hrs * 60) });
                      }} 
                      required 
                    />
                    {isAdmin && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        disabled={savingField === 'minWorkingMinutes'}
                        onClick={() => saveField('minWorkingMinutes', config.minWorkingMinutes)}
                        style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        {savingField === 'minWorkingMinutes' ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Line 3: Overnight Session Attribution & Session Timeout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* 7. Overnight Session Attribution */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Overnight Session Attribution</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      className={`btn ${(config.overnightSessionAttribution || 'false') === 'true' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ minWidth: '110px', padding: '0.5rem 1.2rem', fontWeight: 700 }}
                      disabled={savingField === 'overnightSessionAttribution'}
                      onClick={() => {
                        const nextVal = (config.overnightSessionAttribution || 'false') === 'true' ? 'false' : 'true';
                        setConfig({ ...config, overnightSessionAttribution: nextVal });
                        saveField('overnightSessionAttribution', nextVal);
                      }}
                    >
                      {(config.overnightSessionAttribution || 'false') === 'true' ? 'ON' : 'OFF'}
                    </button>
                    <span className="text-muted" style={{ fontSize: '0.825rem' }}>
                      {savingField === 'overnightSessionAttribution' ? 'Saving...' : '(Click to toggle and save)'}
                    </span>
                  </div>
                </div>

                {/* 8. Session Timeout */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Session Timeout (minutes)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={config.sessionTimeoutMinutes ?? 1440} 
                      onChange={e => setConfig({ ...config, sessionTimeoutMinutes: e.target.value })} 
                    />
                    {isAdmin && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        disabled={savingField === 'sessionTimeoutMinutes'}
                        onClick={() => saveField('sessionTimeoutMinutes', config.sessionTimeoutMinutes)}
                        style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        {savingField === 'sessionTimeoutMinutes' ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </fieldset>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="card" style={{ width: '100%', maxWidth: '1100px', marginTop: '1.5rem' }}>
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
            <ZenvTrashIcon size={16} /> Purge System Test Data
          </button>
        </div>
      )}
    </div>
  );
}
