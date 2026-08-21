import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ZenvRfidScanIcon,
  ZenvQuantumShieldIcon,
  ZenvUsersIcon,
  ZenvClockIcon,
  ZenvFilterIcon
} from '../components/ZenvIcons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../context/RefreshContext';
import { AttendanceBarChart } from '../components/DashboardCharts';
import { formatTime } from '../utils/dateUtils';
import './Dashboard.css';

export function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');
  const navigate = useNavigate();

  const { user } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    if (user?.passwordChangeRequired) return;

    try {
      const [analyticsRes, liveRes, eventsRes, peopleRes, reportRes] = await Promise.all([
        api.get('/dashboard/analytics').catch(() => ({})),
        api.get('/attendance/live').catch(() => ({ headcount: 0, presentMembers: [] })),
        api.get('/events').catch(() => []),
        api.get('/people').catch(() => []),
        api.get('/attendance/report').catch(() => [])
      ]);

      setAnalytics(analyticsRes);
      setLiveData(liveRes);
      setEvents(eventsRes || []);
      setPeople(peopleRes || []);
      setReportData(reportRes || []);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  }, [user?.passwordChangeRequired]);

  useAutoRefresh(fetchDashboardData, { intervalMs: 10000 });

  // 1. Extract Unique Member Types
  const uniqueMemberTypes = useMemo(() => {
    return Array.from(new Set([
      'EMPLOYEE', 'STUDENT',
      ...(people || []).map(p => p.memberType).filter(t => t === 'EMPLOYEE' || t === 'STUDENT')
    ])).sort();
  }, [people]);

  // 2. Filtered People & Lookup Set
  const filteredPeople = useMemo(() => {
    if (selectedType === 'ALL') return people;
    return (people || []).filter(p => p.memberType === selectedType);
  }, [people, selectedType]);

  const filteredPersonIds = useMemo(() => {
    return new Set(filteredPeople.map(p => p.personId));
  }, [filteredPeople]);

  // 3. Filtered Live Data
  const effectiveLiveData = useMemo(() => {
    if (!liveData) return { headcount: 0, presentMembers: [] };
    if (selectedType === 'ALL') return liveData;

    const presentMembers = (liveData.presentMembers || []).filter(m =>
      filteredPersonIds.has(m.personId) || m.memberType === selectedType
    );
    return {
      headcount: presentMembers.length,
      presentMembers
    };
  }, [liveData, selectedType, filteredPersonIds]);

  // 4. Filtered Events
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (selectedType === 'ALL') return events;
    return events.filter(e => {
      if (e.person?.personId) return filteredPersonIds.has(e.person.personId);
      if (e.person?.memberType) return e.person.memberType === selectedType;
      return false;
    });
  }, [events, selectedType, filteredPersonIds]);

  // 5. Filtered Report Data (for Under-Hours, Absent, Total calculations)
  const filteredReportData = useMemo(() => {
    if (!reportData) return [];
    if (selectedType === 'ALL') return reportData;
    return reportData.filter(r => filteredPersonIds.has(r.personId) || r.memberType === selectedType);
  }, [reportData, selectedType, filteredPersonIds]);

  // 6. Effective Analytics Metrics for the 4 Cards
  const effectiveAnalytics = useMemo(() => {
    const totalPeople = filteredPeople.length;
    const presentToday = effectiveLiveData.headcount;

    // Filtered Denied Events
    const deniedTaps = filteredEvents.filter(e => e.decision === 'DENIED').length;

    // Calculate dynamic late arrivals today from live data
    const lateArrivals = (effectiveLiveData.presentMembers || []).filter(m => m.isLate).length;

    // Absentees for today = total filtered people minus present count
    const absentees = Math.max(0, totalPeople - presentToday);

    return {
      totalPeople,
      presentToday,
      lateArrivals,
      absentees,
      deniedTaps
    };
  }, [filteredPeople, effectiveLiveData, filteredEvents]);

  if (loading) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  const recentEventsDisplay = filteredEvents.slice(0, 5);

  return (
    <div className="dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>RFTRACK</h1>
          <p className="text-muted" style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--color-primary-light)', margin: 0 }}>Dashboard Overview</p>
        </div>

        {/* Right Side Type Filter without background color */}
        <div className="type-filter-badge-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
          <ZenvFilterIcon size={16} className="text-muted" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type:</span>
          <select
            id="dashboard-type-select"
            className="form-control"
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.85rem',
              minWidth: '150px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontWeight: 500,
              color: 'var(--color-text-main)'
            }}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="ALL">All Types ({people.length})</option>
            {uniqueMemberTypes.map(t => {
              const count = people.filter(p => p.memberType === t).length;
              return (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Metrics Cards Responsive to Filter (Centered with Suffix Name) */}
      <div className="metrics-grid">
        <div className="metric-card fill-zenv-navy" onClick={() => navigate('/people')}>
          <div className="metric-details">
            <span className="metric-value">{effectiveAnalytics.totalPeople}</span>
            <span className="metric-title">{selectedType === 'ALL' ? 'Total Persons' : `Total ${selectedType.charAt(0) + selectedType.slice(1).toLowerCase()}s`}</span>
          </div>
        </div>

        <div className="metric-card fill-zenv-teal" onClick={() => navigate('/live')}>
          <div className="metric-details">
            <span className="metric-value">{effectiveAnalytics.presentToday}</span>
            <span className="metric-title">Present Today</span>
          </div>
        </div>

        <div className="metric-card fill-zenv-taupe" onClick={() => navigate('/reports')}>
          <div className="metric-details">
            <span className="metric-value">{effectiveAnalytics.lateArrivals} / {effectiveAnalytics.absentees}</span>
            <span className="metric-title">Late / Absent Today</span>
          </div>
        </div>

        <div className="metric-card fill-zenv-darkgreen" onClick={() => navigate('/access-logs', { state: { decision: 'DENIED' } })}>
          <div className="metric-details">
            <span className="metric-value">{effectiveAnalytics.deniedTaps}</span>
            <span className="metric-title">Denied Taps Today</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Chart (Comparison Bar Chart Filtered by Type) */}
      <div className="charts-grid single-chart">
        <AttendanceBarChart
          analytics={effectiveAnalytics}
          liveData={effectiveLiveData}
          reportData={filteredReportData}
          events={filteredEvents}
        />
      </div>

      {/* Recent Access Events Table (Filtered by Type) */}
      <div className="dashboard-content">
        <div className="card chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>
              Recent Access Events {selectedType !== 'ALL' && <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{selectedType}</span>}
            </h3>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
              onClick={() => navigate('/access-logs')}
            >
              View All Access Logs →
            </button>
          </div>
          <div className="data-table-container mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>ID</th>
                  <th>Person Name</th>
                  <th>Type</th>
                  <th>Event Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEventsDisplay.length > 0 ? (
                  recentEventsDisplay.map((ev, i) => (
                    <tr key={ev.eventId || i}>
                      <td>{formatTime(ev.occurredAt, { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        {ev.person ? (
                          <span className="ext-id-badge">
                            {ev.person.externalRef || `EXT-${String(ev.person.personId).padStart(4, '0')}`}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="font-medium">{ev.person ? ev.person.fullName : 'Unknown'}</td>
                      <td>
                        <span className="badge" style={{ fontSize: '0.75rem', background: 'var(--color-bg-subtle)', color: 'var(--color-text-main)' }}>
                          {ev.person?.memberType || '-'}
                        </span>
                      </td>
                      <td>{ev.eventType || 'Denied'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span className={`badge ${ev.decision === 'GRANTED' ? 'badge-success' : 'badge-danger'}`}>
                            {ev.decision}
                          </span>
                          {ev.decision === 'DENIED' && ev.reason && (
                            <span className="text-danger" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                              {ev.reason.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }} className="text-muted">
                      No recent events {selectedType !== 'ALL' ? `for ${selectedType.toLowerCase()}s` : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
