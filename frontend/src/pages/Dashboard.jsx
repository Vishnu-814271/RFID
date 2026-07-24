import React, { useEffect, useState } from 'react';
import { Users, Activity, CreditCard, ShieldAlert, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/dateUtils';
import './Dashboard.css';

export function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (user?.passwordChangeRequired) return;

      try {
        const [analyticsRes, liveRes, eventsRes] = await Promise.all([
          api.get('/dashboard/analytics').catch(() => ({})),
          api.get('/attendance/live').catch(() => ({ headcount: 0 })),
          api.get('/events').catch(() => [])
        ]);

        setAnalytics(analyticsRes);
        setLiveData(liveRes);
        setEvents(eventsRes.slice(0, 5)); // Just take 5 recent events
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.passwordChangeRequired]);

  if (loading) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p className="text-muted">Welcome to the RFID Management System</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card fill-primary" onClick={() => navigate('/people')}>
          <div className="metric-icon">
            <Users size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Total Persons</span>
            <span className="metric-value">{analytics?.totalPeople || 0}</span>
          </div>
        </div>

        <div className="metric-card fill-success" onClick={() => navigate('/live')}>
          <div className="metric-icon">
            <Activity size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Present Today</span>
            <span className="metric-value">{liveData?.headcount || 0}</span>
          </div>
        </div>

        <div className="metric-card fill-info" onClick={() => navigate('/live')}>
          <div className="metric-icon">
            <Activity size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Daily Attendance Rate</span>
            <span className="metric-value">{analytics?.attendanceRate !== undefined ? `${analytics.attendanceRate}%` : '0%'}</span>
          </div>
        </div>

        <div className="metric-card fill-warning" onClick={() => navigate('/reports')}>
          <div className="metric-icon">
            <Clock size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Average Hours</span>
            <span className="metric-value">{analytics?.averageHours !== undefined ? `${analytics.averageHours} hrs` : '0 hrs'}</span>
          </div>
        </div>

        <div className="metric-card fill-purple" onClick={() => navigate('/reports')}>
          <div className="metric-icon">
            <Users size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Late / Absent Today</span>
            <span className="metric-value">{analytics?.lateArrivals || 0} / {analytics?.absentees || 0}</span>
          </div>
        </div>

        <div className="metric-card fill-danger" onClick={() => navigate('/reports')}>
          <div className="metric-icon">
            <ShieldAlert size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Denied Taps Today</span>
            <span className="metric-value">{analytics?.deniedTaps || 0}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="card chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Recent Access Events</h3>
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
                  <th>Person</th>
                  <th>Event Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.length > 0 ? (
                  events.map((ev, i) => (
                    <tr key={ev.eventId || i}>
                      <td>{formatTime(ev.occurredAt, { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{ev.person ? ev.person.fullName : 'Unknown'}</td>
                      <td>{ev.eventType || 'Denied'}</td>
                      <td>
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                          <span className={`badge ${ev.decision === 'GRANTED' ? 'badge-success' : 'badge-danger'}`}>
                            {ev.decision}
                          </span>
                          {ev.decision === 'DENIED' && ev.reason && (
                            <span className="text-danger" style={{fontSize: '0.75rem', marginTop: '2px'}}>
                              {ev.reason.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }} className="text-muted">No recent events</td>
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
