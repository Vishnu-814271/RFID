import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, Filter, Calendar, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../context/RefreshContext';
import { formatDateTime } from '../utils/dateUtils';

// ── Reason label map ──────────────────────────────────────────────────────────
const REASON_MAP = {
  OK:                                  { label: 'OK',                                  icon: '✅', color: 'var(--color-success, #00B894)' },
  DEBOUNCED:                           { label: 'Denied – Debounced',                  icon: '⏱️', color: 'var(--color-warning, #FFB800)' },
  ALREADY_CHECKED_IN:                  { label: 'Denied – Already Checked In',         icon: '🔁', color: 'var(--color-danger,  #FF3B30)' },
  NOT_CHECKED_IN:                      { label: 'Denied – Not Checked In',             icon: '🚪', color: 'var(--color-danger,  #FF3B30)' },
  UNKNOWN_CARD:                        { label: 'Denied – Unknown Card',               icon: '❓', color: 'var(--color-danger,  #FF3B30)' },
  CARD_LOST:                           { label: 'Denied – Card Lost',                  icon: '🔴', color: 'var(--color-danger,  #FF3B30)' },
  CARD_DEACTIVATED:                    { label: 'Denied – Card Deactivated',           icon: '🚫', color: 'var(--color-danger,  #FF3B30)' },
  NO_MAPPING:                          { label: 'Denied – No Card Mapping',            icon: '🔗', color: 'var(--color-danger,  #FF3B30)' },
  PERSON_INACTIVE:                     { label: 'Denied – Person Inactive',            icon: '👤', color: 'var(--color-danger,  #FF3B30)' },
  INVALID_READER:                      { label: 'Denied – Invalid Reader',             icon: '📡', color: 'var(--color-warning, #FFB800)' },
  OVERLAPPING_SESSION:                 { label: 'Denied – Session Overlap',            icon: '⚠️', color: 'var(--color-warning, #FFB800)' },
  INVALID_CHECK_OUT_TIME:              { label: 'Denied – Invalid Checkout Time',      icon: '🕐', color: 'var(--color-warning, #FFB800)' },
  CHECK_IN_BEFORE_FIRST_DAILY_CHECKIN: { label: 'Denied – Before First Check-In',      icon: '⏪', color: 'var(--color-warning, #FFB800)' },
  CHECK_IN_BEFORE_PREVIOUS_CHECKOUT:   { label: 'Denied – Before Previous Checkout',   icon: '⏮️', color: 'var(--color-warning, #FFB800)' },
};

function ReasonBadge({ reason, decision }) {
  if (!reason || reason === 'OK') {
    return <span className="text-muted" style={{ fontSize: '0.82rem' }}>✅ OK</span>;
  }
  const entry = REASON_MAP[reason];
  const icon  = entry?.icon  ?? '⚠️';
  const label = entry?.label ?? reason.replace(/_/g, ' ');
  const color = entry?.color ?? (decision === 'GRANTED' ? 'var(--color-success)' : 'var(--color-danger)');

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      fontSize: '0.82rem',
      fontWeight: 600,
      color,
      background: `${color}18`,
      border: `1px solid ${color}55`,
      borderRadius: '999px',
      padding: '0.18rem 0.65rem',
      whiteSpace: 'nowrap',
    }}>
      {icon} {label}
    </span>
  );
}

function EventTypeBadge({ type }) {
  const isIn = type === 'CHECK_IN';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      fontSize: '0.8rem',
      fontWeight: 600,
      color: isIn ? 'var(--color-success, #00B894)' : 'var(--color-primary, #0066FF)',
      background: isIn ? 'rgba(0,184,148,0.1)' : 'rgba(0,102,255,0.1)',
      border: `1px solid ${isIn ? 'rgba(0,184,148,0.35)' : 'rgba(0,102,255,0.35)'}`,
      borderRadius: '999px',
      padding: '0.18rem 0.65rem',
    }}>
      {isIn ? '↓ Check-In' : '↑ Check-Out'}
    </span>
  );
}

export function AccessLogs() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDecision, setSelectedDecision] = useState('ALL');
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [selectedMemberType, setSelectedMemberType] = useState('ALL');
  const [selectedReason, setSelectedReason] = useState('ALL');
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

  // Collect all unique denial reasons present in data for the filter dropdown
  const availableReasons = Array.from(
    new Set(events.map(e => e.reason).filter(r => r && r !== 'OK'))
  ).sort();

  const filteredEvents = events.filter(ev => {
    const term = searchTerm.toLowerCase();
    const personName = ev.person?.fullName?.toLowerCase() || '';
    const studentId = ev.person?.externalRef?.toLowerCase() || '';
    const cardUid = ev.cardUid?.toLowerCase() || '';
    const reason = ev.reason?.toLowerCase() || '';

    const matchesSearch = !term || personName.includes(term) || studentId.includes(term) || cardUid.includes(term) || reason.includes(term);
    const matchesDecision = selectedDecision === 'ALL' || ev.decision === selectedDecision;
    const matchesEventType = selectedEventType === 'ALL' || ev.eventType === selectedEventType;
    const matchesMemberType = selectedMemberType === 'ALL' || ev.person?.memberType === selectedMemberType;
    const matchesReason = selectedReason === 'ALL' || ev.reason === selectedReason;

    let matchesDate = true;
    if (ev.occurredAt) {
      const eventDateStr = ev.occurredAt.substring(0, 10);
      if (startDate && eventDateStr < startDate) matchesDate = false;
      if (endDate && eventDateStr > endDate) matchesDate = false;
    }

    return matchesSearch && matchesDecision && matchesEventType && matchesMemberType && matchesReason && matchesDate;
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
              placeholder="Search by Name, ID, Card UID..."
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

          {availableReasons.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select className="form-control" value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}>
                <option value="ALL">All Denial Reasons</option>
                {availableReasons.map(r => (
                  <option key={r} value={r}>
                    {REASON_MAP[r]?.label ?? r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                    <td>{ev.eventType ? <EventTypeBadge type={ev.eventType} /> : <span className="text-muted">—</span>}</td>
                    <td>
                      <span className={`badge badge-${ev.decision === 'GRANTED' ? 'success' : 'danger'}`}>
                        {ev.decision}
                      </span>
                    </td>
                    <td><ReasonBadge reason={ev.reason} decision={ev.decision} /></td>
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
