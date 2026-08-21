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

  const sortedMembers = [...(liveData.presentMembers || [])].sort((a, b) => {
    const aOut = a.isCheckedOut || a.status === 'CLOSED' || a.status === 'AUTO_CLOSED';
    const bOut = b.isCheckedOut || b.status === 'CLOSED' || b.status === 'AUTO_CLOSED';
    if (aOut !== bOut) {
      return aOut ? 1 : -1;
    }
    return new Date(b.checkInAt || 0) - new Date(a.checkInAt || 0);
  });

  const filteredMembers = sortedMembers.filter(m => {
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
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Live Attendance</h1>
          <p className="text-muted">Real-time attendance log of all personnel present today.</p>
        </div>
        <div
          className="metric-card fill-zenv-teal"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem 2rem',
            minWidth: '220px',
            minHeight: '80px',
            borderRadius: 'var(--border-radius-sm)',
            boxShadow: '0 4px 16px rgba(16, 43, 76, 0.12)',
            cursor: 'default'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span className="metric-value" style={{ color: '#ffffff', fontSize: '2.3rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {liveData.headcount}
            </span>
            <span className="metric-title" style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Present Today
            </span>
          </div>
          {liveData.currentlyInside !== undefined && (
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: 500 }}>
              {liveData.currentlyInside} in office
            </span>
          )}
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
                  <th>Check-Out Time</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, i) => {
                  const isCheckedOut = m.isCheckedOut || m.status === 'CLOSED' || m.status === 'AUTO_CLOSED';

                  let durationText = '-';
                  if (m.durationMinutes !== null && m.durationMinutes !== undefined && m.durationMinutes > 0) {
                    const h = Math.floor(m.durationMinutes / 60);
                    const min = m.durationMinutes % 60;
                    durationText = `${h}h ${min}m`;
                  } else if (m.checkInAt) {
                    const checkInDate = parseIST(m.checkInAt);
                    const endDate = m.checkOutAt ? parseIST(m.checkOutAt) : new Date();
                    const durationMs = Math.max(0, endDate - checkInDate);
                    const hours = Math.floor(durationMs / 3600000);
                    const minutes = Math.floor((durationMs % 3600000) / 60000);
                    durationText = `${hours}h ${minutes}m`;
                  }

                  return (
                    <tr
                      key={i}
                      style={isCheckedOut ? { backgroundColor: 'rgba(0, 0, 0, 0.02)', opacity: 0.85 } : {}}
                    >
                      <td>
                        <span className="ext-id-badge">
                          {m.externalRef || `EXT-${String(m.personId).padStart(4, '0')}`}
                        </span>
                      </td>
                      <td className="font-medium">{m.fullName}</td>
                      <td>{m.memberType}</td>
                      <td>{m.groupLabel}</td>
                      <td>{formatTime(m.checkInAt)}</td>
                      <td>
                        {m.checkOutAt ? (
                          formatTime(m.checkOutAt)
                        ) : (
                          <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.82rem' }}>
                            -
                          </span>
                        )}
                      </td>
                      <td>{durationText}</td>
                    </tr>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }} className="text-muted">No attendance recorded today.</td>
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
