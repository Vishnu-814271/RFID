import React, { useState, useEffect } from 'react';
import { Activity, Search } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { parseIST, formatTime } from '../utils/dateUtils';

export function LiveAttendance() {
  const [liveData, setLiveData] = useState({ headcount: 0, presentMembers: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLiveData = async () => {
    try {
      const data = await api.get('/attendance/live');
      setLiveData(data || { headcount: 0, presentMembers: [] });
    } catch (err) {
      console.error('Failed to fetch live attendance', err);
    } finally {
      setLoading(false);
    }
  };

  const { user } = useAuth();

  useEffect(() => {
    if (user?.passwordChangeRequired) return;

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [user?.passwordChangeRequired]);

  const filteredMembers = (liveData.presentMembers || []).filter(m => 
    m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.groupLabel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Live Attendance</h1>
          <p className="text-muted">Real-time view of personnel currently in the office.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-subtle)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius)' }}>
          <Activity size={20} className="text-success" />
          <span style={{ fontWeight: 600, fontSize: '1.2rem' }}>{liveData.headcount}</span>
          <span className="text-muted">Present</span>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="search-bar table-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by name or group..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={fetchLiveData}>Refresh</button>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading live data...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person Name</th>
                  <th>Type</th>
                  <th>Group</th>
                  <th>Check-In Time</th>
                  <th>Duration (so far)</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, i) => {
                  const checkInDate = parseIST(m.checkInAt);
                  const durationMs = new Date() - checkInDate;
                  const hours = Math.floor(durationMs / 3600000);
                  const minutes = Math.floor((durationMs % 3600000) / 60000);
                  
                  return (
                    <tr key={i}>
                      <td className="font-medium">{m.fullName}</td>
                      <td>{m.memberType}</td>
                      <td>{m.groupLabel}</td>
                      <td>{formatTime(m.checkInAt)}</td>
                      <td>{hours}h {minutes}m</td>
                    </tr>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center'}} className="text-muted">No one is currently present.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
