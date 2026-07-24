import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Calendar, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/dateUtils';

export function AccessLogs() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDecision, setSelectedDecision] = useState('ALL');
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.get('/events');
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to fetch access events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.passwordChangeRequired) {
      fetchEvents();
    }
  }, [user?.passwordChangeRequired]);

  const filteredEvents = events.filter(ev => {
    const term = searchTerm.toLowerCase();
    const personName = ev.person?.fullName?.toLowerCase() || '';
    const studentId = ev.person?.externalRef?.toLowerCase() || '';
    const cardUid = ev.cardUid?.toLowerCase() || '';
    const reason = ev.reason?.toLowerCase() || '';

    const matchesSearch = !term || personName.includes(term) || studentId.includes(term) || cardUid.includes(term) || reason.includes(term);
    const matchesDecision = selectedDecision === 'ALL' || ev.decision === selectedDecision;
    const matchesEventType = selectedEventType === 'ALL' || ev.eventType === selectedEventType;

    let matchesDate = true;
    if (ev.occurredAt) {
      const eventDateStr = ev.occurredAt.substring(0, 10);
      if (startDate && eventDateStr < startDate) matchesDate = false;
      if (endDate && eventDateStr > endDate) matchesDate = false;
    }

    return matchesSearch && matchesDecision && matchesEventType && matchesDate;
  });

  const totalEvents = filteredEvents.length;
  const grantedCount = filteredEvents.filter(e => e.decision === 'GRANTED').length;
  const deniedCount = filteredEvents.filter(e => e.decision === 'DENIED').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Access Logs</h1>
          <p className="text-muted">Complete historical record of all RFID tap events, check-ins, check-outs, and access decisions.</p>
        </div>
      </div>

      <div className="metrics-grid mb-4">
        <div className="metric-card fill-primary">
          <div className="metric-icon">
            <ShieldAlert size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Total Logged Events</span>
            <span className="metric-value">{totalEvents}</span>
          </div>
        </div>

        <div className="metric-card fill-success">
          <div className="metric-icon">
            <CheckCircle size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Access Granted</span>
            <span className="metric-value">{grantedCount}</span>
          </div>
        </div>

        <div className="metric-card fill-danger">
          <div className="metric-icon">
            <XCircle size={24} color="white" />
          </div>
          <div className="metric-details">
            <span className="metric-title">Access Denied</span>
            <span className="metric-value">{deniedCount}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div className="search-box" style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
            <Search size={18} className="search-icon text-muted" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Name, Student ID, Card UID..."
              className="form-control search-input"
              style={{ paddingLeft: '2.2rem', width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} className="text-muted" />
            <select
              className="form-control"
              value={selectedDecision}
              onChange={(e) => setSelectedDecision(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
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
            <Calendar size={16} className="text-muted" />
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
                  <th>Student ID</th>
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
                    <td style={{ color: 'var(--color-primary, #4f46e5)', fontWeight: 500 }}>
                      {ev.person?.externalRef || (ev.person ? `ID: ${ev.person.personId}` : '-')}
                    </td>
                    <td className="font-medium">{ev.person ? ev.person.fullName : 'Unknown Card'}</td>
                    <td><code style={{ background: 'var(--color-bg-secondary, #f3f4f6)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{ev.cardUid}</code></td>
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
