import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, Activity, ShieldAlert, Clock, Filter } from 'lucide-react';
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

  // 3. Filtered Live Attendance
  const filteredPresentCount = useMemo(() => {
    if (!liveData?.presentMembers) {
      return selectedType === 'ALL' ? (liveData?.headcount || 0) : 0;
    }
    if (selectedType === 'ALL') {
      return liveData.presentMembers.length > 0 ? liveData.presentMembers.length : (liveData.headcount || 0);
    }
    return liveData.presentMembers.filter(m => m.memberType === selectedType).length;
  }, [liveData, selectedType]);

  // 4. Filtered Report Data (Sessions)
  const filteredReportData = useMemo(() => {
    if (selectedType === 'ALL') return reportData;
    return (reportData || []).filter(r => {
      if (r.person?.personId && filteredPersonIds.has(r.person.personId)) return true;
      if (r.personId && filteredPersonIds.has(r.personId)) return true;
      if (r.memberType === selectedType) return true;
      return false;
    });
  }, [reportData, selectedType, filteredPersonIds]);

  // 5. Filtered Access Events
  const filteredEvents = useMemo(() => {
    if (selectedType === 'ALL') return events;
    return (events || []).filter(ev => {
      if (ev.person?.personId && filteredPersonIds.has(ev.person.personId)) return true;
      if (ev.person?.memberType === selectedType) return true;
      return false;
    });
  }, [events, selectedType, filteredPersonIds]);

  // 6. Compute Effective Metrics based on Type Filter
  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];
  const todaySessions = useMemo(() => {
    return (filteredReportData || []).filter(r => 
      r.workDate === todayDateStr || (r.checkInAt && r.checkInAt.startsWith(todayDateStr))
    );
  }, [filteredReportData, todayDateStr]);

  const lateCount = useMemo(() => {
    if (selectedType === 'ALL' && analytics?.lateArrivals !== undefined) {
      return analytics.lateArrivals;
    }
    return todaySessions.filter(s => s.isLate).length;
  }, [selectedType, analytics, todaySessions]);

  const absenteeCount = useMemo(() => {
    return Math.max(0, filteredPeople.length - filteredPresentCount);
  }, [filteredPeople.length, filteredPresentCount]);

  const deniedCount = useMemo(() => {
    if (selectedType === 'ALL' && analytics?.deniedTaps !== undefined) {
      return analytics.deniedTaps;
    }
    return filteredEvents.filter(e => e.decision === 'DENIED').length;
  }, [selectedType, analytics, filteredEvents]);

  const effectiveAnalytics = useMemo(() => ({
    totalPeople: filteredPeople.length,
    presentToday: filteredPresentCount,
    lateArrivals: lateCount,
    absentees: absenteeCount,
    deniedTaps: deniedCount
  }), [filteredPeople.length, filteredPresentCount, lateCount, absenteeCount, deniedCount]);

  const effectiveLiveData = useMemo(() => ({
    ...liveData,
    headcount: filteredPresentCount
  }), [liveData, filteredPresentCount]);

  if (loading) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  const recentEventsDisplay = filteredEvents.slice(0, 5);

  return (
    <div className="dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p className="text-muted">Welcome to the RFID Management System</p>
        </div>

        {/* Right Side Type Filter */}
        <div className="type-filter-badge-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
          <Filter size={16} className="text-muted" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type:</span>
          <select
            id="dashboard-type-select"
            className="form-control"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '150px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}
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

      {/* Metrics Cards Responsive to Filter */}
      <div className="metrics-grid">
        <div className="metric-card fill-zenv-navy" onClick={() => navigate('/people')}>
          <div className="metric-icon">
            <Users size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">{selectedType === 'ALL' ? 'Total Persons' : `Total ${selectedType.charAt(0) + selectedType.slice(1).toLowerCase()}s`}</span>
            <span className="metric-value">{effectiveAnalytics.totalPeople}</span>
          </div>
        </div>

        <div className="metric-card fill-zenv-teal" onClick={() => navigate('/live')}>
          <div className="metric-icon">
            <Activity size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Present Today</span>
            <span className="metric-value">{effectiveAnalytics.presentToday}</span>
          </div>
        </div>

        <div className="metric-card fill-zenv-taupe" onClick={() => navigate('/reports')}>
          <div className="metric-icon">
            <Clock size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Late / Absent Today</span>
            <span className="metric-value">{effectiveAnalytics.lateArrivals} / {effectiveAnalytics.absentees}</span>
          </div>
        </div>

        <div className="metric-card fill-zenv-darkgreen" onClick={() => navigate('/reports')}>
          <div className="metric-icon">
            <ShieldAlert size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Denied Taps Today</span>
            <span className="metric-value">{effectiveAnalytics.deniedTaps}</span>
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
