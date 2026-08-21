import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRefresh, useAutoRefresh } from '../context/RefreshContext';
import { ZenvCheckIcon, ZenvAlertIcon, ZenvTrashIcon } from '../components/ZenvIcons';

const ALL_DAYS = [
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
  { key: 'SAT', label: 'Saturday' },
  { key: 'SUN', label: 'Sunday' }
];

export function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const { triggerRefresh } = useRefresh();

  // Config state
  const [config, setConfig] = useState(null);
  const [initialConfig, setInitialConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [workingDaysDropdownOpen, setWorkingDaysDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchConfig = useCallback(async () => {
    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') return;
    try {
      const data = await api.get('/config');
      setConfig(data);
      setInitialConfig(data);
    } catch (err) {
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  }, [user?.role]);

  useAutoRefresh(fetchConfig);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setWorkingDaysDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parseWorkingDays = (daysStr) => {
    if (!daysStr) return [];
    return daysStr.split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
  };

  const handleToggleDay = (dayKey) => {
    const current = parseWorkingDays(config.workingDays);
    let updated;
    if (current.includes(dayKey)) {
      updated = current.filter(d => d !== dayKey);
    } else {
      const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      updated = [...current, dayKey].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    }
    setConfig({ ...config, workingDays: updated.join(',') });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!config || !initialConfig) return;

    // Detect and package ONLY fields that changed
    const modifiedPayload = {};
    let hasChanges = false;

    if (config.expectedStartTime !== initialConfig.expectedStartTime) {
      modifiedPayload.expectedStartTime = config.expectedStartTime;
      hasChanges = true;
    }
    if (parseInt(config.lateGraceMinutes, 10) !== parseInt(initialConfig.lateGraceMinutes, 10)) {
      modifiedPayload.lateGraceMinutes = parseInt(config.lateGraceMinutes, 10);
      hasChanges = true;
    }
    if (config.autoCheckoutTime !== initialConfig.autoCheckoutTime) {
      modifiedPayload.autoCheckoutTime = config.autoCheckoutTime;
      hasChanges = true;
    }
    if (config.workingDays !== initialConfig.workingDays) {
      modifiedPayload.workingDays = config.workingDays;
      hasChanges = true;
    }
    if (parseInt(config.tapDebounceSeconds, 10) !== parseInt(initialConfig.tapDebounceSeconds, 10)) {
      modifiedPayload.tapDebounceSeconds = parseInt(config.tapDebounceSeconds, 10);
      hasChanges = true;
    }
    if (parseInt(config.minWorkingMinutes, 10) !== parseInt(initialConfig.minWorkingMinutes, 10)) {
      modifiedPayload.minWorkingMinutes = parseInt(config.minWorkingMinutes, 10);
      hasChanges = true;
    }
    if (String(config.overnightSessionAttribution) !== String(initialConfig.overnightSessionAttribution)) {
      modifiedPayload.overnightSessionAttribution = String(config.overnightSessionAttribution);
      hasChanges = true;
    }

    if (!hasChanges) {
      toast.info('No modified parameters detected to save.');
      return;
    }

    setSaving(true);
    setSaveStatus(null);
    try {
      const updatedData = await api.patch('/config', modifiedPayload);
      setConfig(updatedData);
      setInitialConfig(updatedData);
      triggerRefresh();
      const msg = 'Modified configuration saved successfully!';
      setSaveStatus({ type: 'success', message: msg });
      toast.success(msg);
    } catch (err) {
      const errMsg = `Error saving configuration: ${err.message || err.error || JSON.stringify(err)}`;
      setSaveStatus({ type: 'error', message: errMsg });
      toast.error(errMsg);
    } finally {
      setSaving(false);
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
          <p className="text-muted">Manage system parameters. Only changed configurations are saved upon submission.</p>
        </div>
      </div>

      <div className="card" style={{ width: '100%' }}>
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
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <fieldset disabled={!isAdmin} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              {/* Line 1: Expected Start Time, Late Grace Period, Auto Checkout Time */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem', width: '100%' }}>
                {/* 1. Expected Start Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Expected Start Time (HH:mm)</label>
                  <input
                    type="time"
                    className="form-control"
                    value={config.expectedStartTime || '09:30'}
                    onChange={e => setConfig({ ...config, expectedStartTime: e.target.value })}
                    required
                  />
                </div>

                {/* 2. Late Grace Period */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Late Grace Period (minutes)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.lateGraceMinutes ?? 15}
                    onChange={e => setConfig({ ...config, lateGraceMinutes: e.target.value })}
                    required
                  />
                </div>

                {/* 3. Auto Checkout Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Auto Checkout Time (HH:mm)</label>
                  <input
                    type="time"
                    className="form-control"
                    value={config.autoCheckoutTime || '20:00'}
                    onChange={e => setConfig({ ...config, autoCheckoutTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Line 2: Working Days, Tap Debounce, Minimum Working Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem', width: '100%' }}>
                {/* 4. Working Days Dropdown with Checkboxes */}
                <div className="form-group" style={{ margin: 0, position: 'relative' }} ref={dropdownRef}>
                  <label className="form-label">Working Days</label>
                  <button
                    type="button"
                    className="form-control"
                    onClick={() => isAdmin && setWorkingDaysDropdownOpen(!workingDaysDropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: isAdmin ? 'pointer' : 'default',
                      background: 'var(--color-bg-surface)',
                      minHeight: '38px',
                      padding: '0.45rem 0.75rem',
                      fontWeight: 500,
                      color: 'var(--color-text-main)'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {parseWorkingDays(config.workingDays).length > 0
                        ? `${parseWorkingDays(config.workingDays).join(', ')} (${parseWorkingDays(config.workingDays).length} days)`
                        : 'Select working days...'}
                    </span>
                    <span style={{ transform: workingDaysDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ▼
                    </span>
                  </button>

                  {workingDaysDropdownOpen && isAdmin && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'var(--color-bg-surface)',
                      borderRadius: 'var(--border-radius-sm)',
                      boxShadow: '0 12px 32px rgba(16, 43, 76, 0.18), 0 3px 10px rgba(16, 43, 76, 0.08)',
                      zIndex: 1000,
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      border: 'none'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(16, 43, 76, 0.08)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        <span>Select Working Days</span>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: 0 }}
                          onClick={() => {
                            const current = parseWorkingDays(config.workingDays);
                            if (current.length === ALL_DAYS.length) {
                              setConfig({ ...config, workingDays: '' });
                            } else {
                              setConfig({ ...config, workingDays: 'MON,TUE,WED,THU,FRI' });
                            }
                          }}
                        >
                          {parseWorkingDays(config.workingDays).length === ALL_DAYS.length ? 'Clear All' : 'Weekdays (Mon-Fri)'}
                        </button>
                      </div>
                      {ALL_DAYS.map(day => {
                        const isChecked = parseWorkingDays(config.workingDays).includes(day.key);
                        return (
                          <label
                            key={day.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.65rem',
                              padding: '0.45rem 0.6rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: isChecked ? 600 : 400,
                              backgroundColor: isChecked ? 'rgba(16, 43, 76, 0.05)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDay(day.key)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                            />
                            <span>{day.label} <strong style={{ color: 'var(--color-primary-light)', fontSize: '0.8rem' }}></strong></span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. Tap Debounce */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tap Debounce (seconds)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.tapDebounceSeconds ?? 10}
                    onChange={e => setConfig({ ...config, tapDebounceSeconds: e.target.value })}
                    required
                  />
                </div>

                {/* 6. Minimum Working Hours */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Minimum Working Hours</label>
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
                </div>
              </div>

              {/* Line 3: Overnight Session Attribution */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem', width: '100%' }}>
                {/* 7. Overnight Session Attribution Switch */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Overnight Session Attribution</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.4rem' }}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={(config.overnightSessionAttribution || 'false') === 'true'}
                      disabled={!isAdmin}
                      onClick={() => {
                        const nextVal = (config.overnightSessionAttribution || 'false') === 'true' ? 'false' : 'true';
                        setConfig({ ...config, overnightSessionAttribution: nextVal });
                      }}
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        width: '48px',
                        height: '26px',
                        padding: '3px',
                        borderRadius: '13px',
                        border: 'none',
                        background: (config.overnightSessionAttribution || 'false') === 'true' 
                          ? 'linear-gradient(135deg, #102b4d 0%, #1e556d 100%)' 
                          : '#cbd5e1',
                        boxShadow: (config.overnightSessionAttribution || 'false') === 'true'
                          ? '0 2px 8px rgba(16, 43, 76, 0.28)'
                          : 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
                        cursor: isAdmin ? 'pointer' : 'default',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        outline: 'none'
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                          transform: (config.overnightSessionAttribution || 'false') === 'true'
                            ? 'translateX(22px)'
                            : 'translateX(0px)',
                          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      />
                    </button>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: (config.overnightSessionAttribution || 'false') === 'true'
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)'
                    }}>
                      {(config.overnightSessionAttribution || 'false') === 'true' ? 'Enabled (ON)' : 'Disabled (OFF)'}
                    </span>
                  </div>
                </div>
              </div>

            </fieldset>

            {/* Single Unified Save Button */}
            {isAdmin && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.6rem', fontWeight: 600, fontSize: '0.925rem' }}
                >
                  <ZenvCheckIcon size={18} />
                  <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {isAdmin && (
        <div className="card" style={{ width: '100%', marginTop: '1.5rem' }}>
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
