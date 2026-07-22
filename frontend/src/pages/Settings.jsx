import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Save } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  
  // Config state
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      fetchConfig();
    }
  }, [user?.role]);

  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const data = await api.get('/config');
      // workingDays is returned as comma separated string
      setConfig(data);
    } catch (err) {
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    try {
      await api.patch('/config', {
        expectedStartTime: config.expectedStartTime,
        lateGraceMinutes: parseInt(config.lateGraceMinutes),
        autoCheckoutTime: config.autoCheckoutTime,
        workingDays: config.workingDays, // Backend expects a string, not an array
        tapDebounceSeconds: parseInt(config.tapDebounceSeconds),
        sessionTimeoutMinutes: parseInt(config.sessionTimeoutMinutes),
        minWorkingMinutes: parseInt(config.minWorkingMinutes),
        overnightSessionAttribution: String(config.overnightSessionAttribution),
        manualCheckinCheckoutEnabled: config.manualCheckinCheckoutEnabled === true || config.manualCheckinCheckoutEnabled === 'true'
      });
      alert('Configuration saved successfully');
    } catch (err) {
      alert(`Error saving config: ${err.message || err.error || JSON.stringify(err)}`);
    } finally {
      setConfigLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

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
        {configLoading && !config ? <p>Loading...</p> : config && (
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
            <div className="form-group">
              <label className="form-label">Manual Check-In / Check-Out Buttons</label>
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${String(config.manualCheckinCheckoutEnabled) === 'true' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '120px', padding: '0.6rem 1.2rem', fontWeight: 600 }}
                  onClick={() => {
                    const nextVal = String(config.manualCheckinCheckoutEnabled) === 'true' ? false : true;
                    setConfig({...config, manualCheckinCheckoutEnabled: nextVal});
                  }}
                >
                  {String(config.manualCheckinCheckoutEnabled) === 'true' ? 'ENABLED' : 'DISABLED'}
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
    </div>
  );
}
