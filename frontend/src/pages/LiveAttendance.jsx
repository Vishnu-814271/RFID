import React, { useState, useEffect, useCallback } from 'react';
import { ZenvRfidScanIcon, ZenvSearchIcon, ZenvRefreshIcon } from '../components/ZenvIcons';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../context/RefreshContext';
import { parseIST, formatTime } from '../utils/dateUtils';

export function LiveAttendance() {
  const [liveData, setLiveData] = useState({ headcount: 0, presentMembers: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const fetchLiveData = useCallback(async () => {
    if (user?.passwordChangeRequired) return;
    try {
      const data = await api.get('/attendance/live');
      setLiveData(data || { headcount: 0, presentMembers: [] });
    } catch (err) {
      console.error('Failed to fetch live attendance', err);
    } finally {
      setLoading(false);
    }
  }, [user?.passwordChangeRequired]);

  useAutoRefresh(fetchLiveData, { intervalMs: 10000 });

  const [memberTypeFilter, setMemberTypeFilter] = useState('ALL');

  // Extract unique member types (EMPLOYEE & STUDENT only)
  const uniqueMemberTypes = Array.from(new Set([
    'EMPLOYEE', 'STUDENT',
    ...(liveData.presentMembers || []).map(m => m.memberType).filter(t => t === 'EMPLOYEE' || t === 'STUDENT')
  ])).sort();

  const filteredMembers = (liveData.presentMembers || []).filter(m => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      m.fullName?.toLowerCase().includes(term) ||
      m.externalRef?.toLowerCase().includes(term) ||
      m.personId?.toString().includes(term) ||
      m.groupLabel?.toLowerCase().includes(term)
    );
    const matchesType = memberTypeFilter === 'ALL' || m.memberType === memberTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Live Attendance</h1>
          <p className="text-muted">Real-time view of personnel currently in the office.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-subtle)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)' }}>
          <ZenvRfidScanIcon size={20} className="text-success" />
          <span style={{ fontWeight: 600, fontSize: '1.2rem' }}>{liveData.headcount}</span>
          <span className="text-muted">Present</span>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div className="search-bar table-search" style={{ flex: '1 1 250px' }}>
            <ZenvSearchIcon size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by name, student ID, group..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '160px' }}
                value={memberTypeFilter}
                onChange={(e) => setMemberTypeFilter(e.target.value)}
              >
                <option value="ALL">All Types ({(liveData.presentMembers || []).length})</option>
                {uniqueMemberTypes.map(t => {
                  const count = (liveData.presentMembers || []).filter(m => m.memberType === t).length;
                  return (
                    <option key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <button className="btn btn-secondary" onClick={fetchLiveData} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <ZenvRefreshIcon size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading live data...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
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
                      <td>
                        <span className="ext-id-badge">
                          {m.externalRef || `EXT-${String(m.personId).padStart(4, '0')}`}
                        </span>
                      </td>
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
                    <td colSpan="6" style={{textAlign: 'center'}} className="text-muted">No one is currently present.</td>
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
