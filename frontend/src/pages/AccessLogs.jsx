import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  ZenvQuantumShieldIcon, 
  ZenvCheckIcon, 
  ZenvBanIcon, 
  ZenvSearchIcon, 
  ZenvFilterIcon, 
  ZenvCalendarIcon 
} from '../components/ZenvIcons';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../context/RefreshContext';
import { formatDateTime } from '../utils/dateUtils';

export function AccessLogs() {
  const { user } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDecision, setSelectedDecision] = useState(location.state?.decision || 'ALL');
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [selectedMemberType, setSelectedMemberType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchEvents = useCallback(async () => {
    if (user?.passwordChangeRequired) return;
    try {
      const data = await api.get('/events');
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to fetch access events', err);
    } finally {
      setLoading(false);
    }
  }, [user?.passwordChangeRequired]);

  useAutoRefresh(fetchEvents, { intervalMs: 10000 });

  const filteredEvents = events.filter((ev) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      (ev.person && ev.person.fullName.toLowerCase().includes(term)) ||
      (ev.person && ev.person.externalRef && ev.person.externalRef.toLowerCase().includes(term)) ||
      (ev.person && ev.person.personId && ev.person.personId.toString().includes(term)) ||
      (ev.cardUid && ev.cardUid.toLowerCase().includes(term));

    const matchesDecision = selectedDecision === 'ALL' || ev.decision === selectedDecision;
    const matchesEventType = selectedEventType === 'ALL' || ev.eventType === selectedEventType;
    const matchesMemberType = selectedMemberType === 'ALL' || (ev.person && ev.person.memberType === selectedMemberType);

    let matchesDate = true;
    if (startDate || endDate) {
      const evDate = ev.occurredAt ? ev.occurredAt.split('T')[0] : '';
      if (startDate && evDate < startDate) matchesDate = false;
      if (endDate && evDate > endDate) matchesDate = false;
    }

    return matchesSearch && matchesDecision && matchesEventType && matchesMemberType && matchesDate;
  });

  const totalEvents = events.length;
  const grantedCount = events.filter(e => e.decision === 'GRANTED').length;
  const deniedCount = events.filter(e => e.decision === 'DENIED').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Access Logs</h1>
          <p className="text-muted">Complete historical record of all RFID tap events, check-ins, check-outs, and access decisions.</p>
        </div>
      </div>

      <div className="metrics-grid mb-4">
        <div className="metric-card fill-zenv-navy">
          <div className="metric-details">
            <span className="metric-value">{totalEvents}</span>
            <span className="metric-title">Total Logged Events</span>
          </div>
        </div>

        <div className="metric-card fill-zenv-teal">
          <div className="metric-details">
            <span className="metric-value">{grantedCount}</span>
            <span className="metric-title">Access Granted</span>
          </div>
        </div>

        <div className="metric-card fill-zenv-darkgreen">
          <div className="metric-details">
            <span className="metric-value">{deniedCount}</span>
            <span className="metric-title">Access Denied</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div className="search-bar table-search" style={{ flex: '1 1 260px', minWidth: '220px' }}>
            <ZenvSearchIcon size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Name, ID, Card UID..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ZenvFilterIcon size={16} className="text-muted" />
            <select
              className="form-control"
              value={selectedMemberType}
              onChange={(e) => setSelectedMemberType(e.target.value)}
            >
              <option value="ALL">All Personnel Types</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="STUDENT">Students</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              className="form-control"
              value={selectedDecision}
              onChange={(e) => setSelectedDecision(e.target.value)}
            >
              <option value="ALL">All Decisions</option>
              <option value="GRANTED">Granted</option>
              <option value="DENIED">Denied</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              className="form-control"
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
            >
              <option value="ALL">All Event Types</option>
              <option value="CHECK_IN">Check-In</option>
              <option value="CHECK_OUT">Check-Out</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ZenvCalendarIcon size={16} className="text-muted" />
            <input
              type="date"
              className="form-control"
              style={{ padding: '0.25rem 0.5rem' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-muted">to</span>
            <input
              type="date"
              className="form-control"
              style={{ padding: '0.25rem 0.5rem' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {(startDate || endDate) && (
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => { setStartDate(''); setEndDate(''); }}>
                Clear Dates
              </button>
            )}
          </div>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading access logs...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Card UID</th>
                  <th>Event Type</th>
                  <th>Decision</th>
                  <th>Reason / Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev, i) => (
                  <tr key={ev.eventId || i}>
                    <td className="font-medium">{formatDateTime(ev.occurredAt)}</td>
                    <td>
                      {ev.person ? (
                        <span className="ext-id-badge">
                          {ev.person.externalRef || `EXT-${String(ev.person.personId).padStart(4, '0')}`}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="font-medium">{ev.person ? ev.person.fullName : 'Unknown Card'}</td>
                    <td><code style={{ background: 'var(--color-bg-subtle)', padding: '0.2rem 0.4rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-border)' }}>{ev.cardUid}</code></td>
                    <td>{ev.eventType || '-'}</td>
                    <td>
                      <span className={`badge badge-${ev.decision === 'GRANTED' ? 'success' : 'danger'}`}>
                        {ev.decision}
                      </span>
                    </td>
                    <td>
                      {ev.reason ? (
                        <span className="text-danger font-medium" style={{ fontSize: '0.85rem' }}>
                          {ev.reason.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>OK</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }} className="text-muted">
                      No access events match the specified filters.
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
