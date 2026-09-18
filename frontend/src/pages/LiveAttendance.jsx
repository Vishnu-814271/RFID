import React, { useState, useCallback } from 'react';
import { ZenvSearchIcon } from '../components/ZenvIcons';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../context/RefreshContext';
import { parseIST, formatTime } from '../utils/dateUtils';
import './LiveAttendance.css';

export function LiveAttendance() {
  const [liveData, setLiveData] = useState({ 
    headcount: 0, 
    presentCount: 0, 
    absentCount: 0, 
    currentlyInside: 0, 
    presentMembers: [], 
    absentMembers: [] 
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('ALL'); // 'ALL' | 'IN_OFFICE' | 'PRESENT' | 'ABSENT'
  const [memberTypeFilter, setMemberTypeFilter] = useState('ALL');
  const { user } = useAuth();

  const fetchLiveData = useCallback(async () => {
    if (user?.passwordChangeRequired) return;
    try {
      const data = await api.get('/attendance/live');
      setLiveData(data || { 
        headcount: 0, 
        presentCount: 0, 
        absentCount: 0, 
        currentlyInside: 0, 
        presentMembers: [], 
        absentMembers: [] 
      });
    } catch (err) {
      console.error('Failed to fetch live attendance', err);
    } finally {
      setLoading(false);
    }
  }, [user?.passwordChangeRequired]);

  useAutoRefresh(fetchLiveData, { intervalMs: 10000 });

  const presentMembers = liveData.presentMembers || [];
  const absentMembers = liveData.absentMembers || [];
  const presentCount = liveData.presentCount ?? liveData.headcount ?? presentMembers.length;
  const absentCount = liveData.absentCount ?? absentMembers.length;
  const currentlyInsideCount = liveData.currentlyInside ?? presentMembers.filter(m => !m.isCheckedOut && m.status === 'OPEN').length;

  // Sort present members: OPEN sessions first, then by check-in time desc
  const sortedPresentMembers = [...presentMembers].sort((a, b) => {
    const aOut = a.isCheckedOut || a.status === 'CLOSED' || a.status === 'AUTO_CLOSED';
    const bOut = b.isCheckedOut || b.status === 'CLOSED' || b.status === 'AUTO_CLOSED';
    if (aOut !== bOut) {
      return aOut ? 1 : -1;
    }
    return new Date(b.checkInAt || 0) - new Date(a.checkInAt || 0);
  });

  const inOfficeMembers = sortedPresentMembers.filter(m => !m.isCheckedOut && m.status === 'OPEN');

  // Sort absent members: alphabetically by name
  const sortedAbsentMembers = [...absentMembers].sort((a, b) => 
    (a.fullName || '').localeCompare(b.fullName || '')
  );

  // Selected attendance records list
  const recordsInAttendance = attendanceFilter === 'IN_OFFICE'
    ? inOfficeMembers
    : attendanceFilter === 'PRESENT'
    ? sortedPresentMembers
    : attendanceFilter === 'ABSENT'
    ? sortedAbsentMembers
    : [...sortedPresentMembers, ...sortedAbsentMembers];

  // Extract unique member types
  const uniqueMemberTypes = Array.from(new Set([
    'EMPLOYEE', 'STUDENT',
    ...recordsInAttendance.map(m => m.memberType).filter(t => t === 'EMPLOYEE' || t === 'STUDENT')
  ])).sort();

  const filteredMembers = recordsInAttendance.filter(m => {
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <h1>Live Attendance</h1>
          <p className="text-muted">Real-time attendance tracking of presents and absents today.</p>
        </div>

        {/* Live Attendance Metric Displays (ZENV Brand Colors & Sharp 2px Radii) */}
        <div className="live-metrics-header">
          {/* In Office Now Widget - ZenV Accent Blue (#193e65) */}
          <div
            className={`live-metric-card card-in-office ${attendanceFilter === 'IN_OFFICE' ? 'active' : ''}`}
            onClick={() => setAttendanceFilter(prev => prev === 'IN_OFFICE' ? 'ALL' : 'IN_OFFICE')}
            title="Click to filter In Office personnel"
          >
            <div className="metric-tag">
              In Office Now
            </div>
            <div className="metric-val-row">
              <span className="metric-num">
                {currentlyInsideCount}
              </span>
              <span className="metric-subtext">
                active inside
              </span>
            </div>
          </div>

          {/* Present Today Widget - ZenV Teal (#1e556d) */}
          <div
            className={`live-metric-card card-present ${attendanceFilter === 'PRESENT' ? 'active' : ''}`}
            onClick={() => setAttendanceFilter(prev => prev === 'PRESENT' ? 'ALL' : 'PRESENT')}
            title="Click to filter Present personnel"
          >
            <div className="metric-tag">
              Present Today
            </div>
            <div className="metric-val-row">
              <span className="metric-num">
                {presentCount}
              </span>
              <span className="metric-subtext">
                checked in
              </span>
            </div>
          </div>

          {/* Absent Today Widget - ZenV Terracotta (#D45529) */}
          <div
            className={`live-metric-card card-absent ${attendanceFilter === 'ABSENT' ? 'active' : ''}`}
            onClick={() => setAttendanceFilter(prev => prev === 'ABSENT' ? 'ALL' : 'ABSENT')}
            title="Click to filter Absent personnel"
          >
            <div className="metric-tag">
              Absent Today
            </div>
            <div className="metric-val-row">
              <span className="metric-num">
                {absentCount}
              </span>
              <span className="metric-subtext">
                not checked in
              </span>
            </div>
          </div>
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
            {/* Attendance Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Attendance:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '160px' }}
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
              >
                <option value="ALL">All ({presentCount + absentCount})</option>
                <option value="IN_OFFICE">In Office ({currentlyInsideCount})</option>
                <option value="PRESENT">Present Today ({presentCount})</option>
                <option value="ABSENT">Absent Today ({absentCount})</option>
              </select>
            </div>

            {/* Member Type Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '150px' }}
                value={memberTypeFilter}
                onChange={(e) => setMemberTypeFilter(e.target.value)}
              >
                <option value="ALL">All Types ({recordsInAttendance.length})</option>
                {uniqueMemberTypes.map(t => {
                  const count = recordsInAttendance.filter(m => m.memberType === t).length;
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
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading live attendance data...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Person Name</th>
                  <th>Type</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Check-In Time</th>
                  <th>Check-Out Time</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, i) => {
                  const isAbsent = m.attendanceStatus === 'ABSENT' || m.status === 'ABSENT';
                  const isCheckedOut = m.isCheckedOut || m.status === 'CLOSED' || m.status === 'AUTO_CLOSED';

                  let durationText = '-';
                  if (!isAbsent) {
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
                  }

                  return (
                    <tr
                      key={i}
                      style={
                        isAbsent 
                          ? { backgroundColor: 'rgba(212, 85, 41, 0.02)' }
                          : {}
                      }
                    >
                      <td>
                        <span className="badge-zenv-extid">
                          {m.externalRef || `EXT-${String(m.personId).padStart(4, '0')}`}
                        </span>
                      </td>
                      <td className="font-medium">{m.fullName || '-'}</td>
                      <td>{m.memberType ? (m.memberType.charAt(0) + m.memberType.slice(1).toLowerCase()) : 'Employee'}</td>
                      <td>{m.groupLabel || 'N/A'}</td>
                      <td>
                        {isAbsent ? (
                          <span className="badge-zenv-absent">
                            Absent
                          </span>
                        ) : (
                          <span className="badge-zenv-present">
                            Present
                          </span>
                        )}
                      </td>
                      <td>
                        {!isAbsent && m.checkInAt ? (
                          formatTime(m.checkInAt)
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {!isAbsent && m.checkOutAt ? (
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
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                      {attendanceFilter === 'ABSENT' 
                        ? 'No absentees today. 100% attendance recorded!' 
                        : attendanceFilter === 'PRESENT' 
                        ? 'No personnel present today yet.' 
                        : 'No attendance records found today.'}
                    </td>
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

