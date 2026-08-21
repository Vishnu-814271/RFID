import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { 
  ZenvDownloadIcon, 
  ZenvSearchIcon, 
  ZenvCalendarIcon, 
  ZenvReportIcon, 
  ZenvEditIcon 
} from '../components/ZenvIcons';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRefresh, useAutoRefresh } from '../context/RefreshContext';
import { formatTime, formatHours, formatMinutesToHours } from '../utils/dateUtils';

export function Reports() {
  const { user } = useAuth();
  const toast = useToast();
  const { triggerRefresh } = useRefresh();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberType, setSelectedMemberType] = useState('ALL');
  const [selectedGroupLabel, setSelectedGroupLabel] = useState('ALL');
  const [selectedStatusTab, setSelectedStatusTab] = useState('ACTIVE');
  
  // Default to the current month (from 1st of this month to today)
  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const currentToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentToday);

  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personSessions, setPersonSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  const [showAbsencesModal, setShowAbsencesModal] = useState(false);
  const [selectedAbsencePerson, setSelectedAbsencePerson] = useState(null);
  
  const [correctionMode, setCorrectionMode] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({ checkOutAt: '', correctionReason: '' });

  const fetchReport = useCallback(async () => {
    if (user?.passwordChangeRequired) return;
    try {
      const data = await api.get(`/attendance/report?startDate=${startDate}&endDate=${endDate}`);
      setReportData(data || []);
    } catch (err) {
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, user?.passwordChangeRequired]);

  useAutoRefresh(fetchReport, { intervalMs: 10000 });

  const handleExportCSV = async () => {
    try {
      let exportUrl = `/api/attendance/report/export?startDate=${startDate}&endDate=${endDate}`;
      if (selectedMemberType !== 'ALL') {
        exportUrl += `&memberType=${selectedMemberType}`;
      }
      if (selectedGroupLabel !== 'ALL') {
        exportUrl += `&groupLabel=${encodeURIComponent(selectedGroupLabel)}`;
      }

      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance report downloaded successfully!");
    } catch (err) {
      console.error("Failed to download CSV report", err);
      toast.error("Failed to download CSV report");
    }
  };

  const openSessionsModal = async (person) => {
    setSelectedPerson(person);
    setCorrectionMode(null);
    setShowSessionsModal(true);
    setSessionsLoading(true);
    try {
      const data = await api.get(`/people/${person.personId}/attendance`);
      setPersonSessions(data || []);
    } catch (err) {
      console.error("Failed to load attendance sessions", err);
      toast.error("Failed to load attendance sessions");
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        correctionReason: correctionForm.correctionReason
      };
      
      if (correctionForm.checkOutAt) {
        // Assume checkOutAt input is datetime-local (YYYY-MM-DDTHH:mm)
        // Convert to ISO_LOCAL_DATE_TIME expected by backend (YYYY-MM-DDTHH:mm:ss)
        payload.checkOutAt = correctionForm.checkOutAt + ":00";
      }

      await api.patch(`/attendance/sessions/${correctionMode}`, payload);
      setCorrectionMode(null);
      // Refresh sessions
      const data = await api.get(`/people/${selectedPerson.personId}/attendance`);
      setPersonSessions(data || []);
      fetchReport(); // Also refresh the main report to update hours
      toast.success("Session corrected successfully.");
    } catch (err) {
      toast.error(err?.message || "Failed to correct session");
    }
  };

  const uniqueGroupLabels = Array.from(new Set(reportData.map(row => row.groupLabel).filter(Boolean))).sort();

  const activeCount = reportData.filter(r => r.status !== 'INACTIVE').length;
  const inactiveCount = reportData.filter(r => r.status === 'INACTIVE').length;

  const filteredData = reportData.filter(row => {
    const matchesSearch = searchTerm === '' || 
      row.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.externalRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.groupLabel?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesMemberType = selectedMemberType === 'ALL' || row.memberType === selectedMemberType;
    const matchesGroupLabel = selectedGroupLabel === 'ALL' || row.groupLabel === selectedGroupLabel;
    const matchesStatus = selectedStatusTab === 'ALL' || (selectedStatusTab === 'INACTIVE' ? row.status === 'INACTIVE' : row.status !== 'INACTIVE');
    
    return matchesSearch && matchesMemberType && matchesGroupLabel && matchesStatus;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Attendance Reports</h1>
          <p className="text-muted">Generate, view, and export attendance data.</p>
        </div>
        <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ZenvDownloadIcon size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="search-bar table-search" style={{ flex: '1 1 200px', marginBottom: 0 }}>
            <ZenvSearchIcon size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by name or group..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Member Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Type:</span>
              <select 
                className="form-control" 
                style={{ padding: '0.25rem 0.5rem', minWidth: '130px' }}
                value={selectedMemberType}
                onChange={(e) => setSelectedMemberType(e.target.value)}
              >
                <option value="ALL">All Types</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>

            {/* Group Label Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Group:</span>
              <select 
                className="form-control" 
                style={{ padding: '0.25rem 0.5rem', minWidth: '120px' }}
                value={selectedGroupLabel}
                onChange={(e) => setSelectedGroupLabel(e.target.value)}
              >
                <option value="ALL">All Groups</option>
                {uniqueGroupLabels.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown Filter (Active, Deactivated, All Members) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Status:</span>
              <select 
                className="form-control" 
                style={{ padding: '0.25rem 0.5rem', minWidth: '185px' }}
                value={selectedStatusTab}
                onChange={(e) => setSelectedStatusTab(e.target.value)}
              >
                <option value="ACTIVE">Active Personnel ({activeCount})</option>
                <option value="INACTIVE">Deactivated Personnel ({inactiveCount})</option>
                <option value="ALL">All Members ({reportData.length})</option>
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
            </div>
            <span className="text-muted">to</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ZenvCalendarIcon size={16} className="text-muted" />
              <input 
                type="date" 
                className="form-control" 
                style={{ padding: '0.25rem 0.5rem' }} 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading reports...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Group</th>
                  <th>Present</th>
                  <th>Under Hours</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Missed Checkouts</th>
                  <th>Total Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        background: '#f1f5f9',
                        color: '#0f172a',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        display: 'inline-block'
                      }}>
                        {row.externalRef || `EXT-${String(row.personId).padStart(4, '0')}`}
                      </span>
                    </td>
                    <td className="font-medium">
                      {row.fullName || 'N/A'}
                      {row.status === 'INACTIVE' && (
                        <span className="badge badge-danger" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td>{row.memberType || 'N/A'}</td>
                    <td>{row.groupLabel || 'N/A'}</td>
                    <td><span className="text-success font-medium">{row.daysPresent || 0}</span></td>
                    <td>
                      {(row.underHoursDays || 0) > 0 ? (
                        <span
                          className="badge"
                          style={{
                            background: '#fff7ed',
                            color: '#c2410c',
                            border: '1px solid #fed7aa',
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            fontWeight: 600
                          }}
                          title="Tapped in but worked less than the minimum required hours"
                        >
                          {row.underHoursDays} {row.underHoursDays === 1 ? 'day' : 'days'}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>0 days</span>
                      )}
                    </td>
                    <td>
                      {row.absentDays > 0 ? (
                        <button 
                          className="badge badge-danger" 
                          style={{ cursor: 'pointer', border: 'none', padding: '4px 8px', fontSize: '0.85rem', fontWeight: 600 }}
                          onClick={() => {
                            setSelectedAbsencePerson(row);
                            setShowAbsencesModal(true);
                          }}
                          title="Click to view specific dates missed"
                        >
                          {row.absentDays} {row.absentDays === 1 ? 'day' : 'days'}
                        </button>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>0 days</span>
                      )}
                    </td>
                    <td><span className="text-warning font-medium">{row.lateCount || 0}</span></td>
                    <td>
                      {row.missedCheckouts > 0 ? (
                        <span className="badge badge-danger" style={{ display: 'inline-block' }}>
                          {row.missedCheckouts} Missed check-out
                        </span>
                      ) : (
                        0
                      )}
                    </td>
                    <td>{formatHours(row.totalHours)}</td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }} onClick={() => openSessionsModal(row)}>
                        <ZenvReportIcon size={14} style={{ marginRight: '4px' }}/> Sessions
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center' }} className="text-muted">No attendance data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showSessionsModal && selectedPerson && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Attendance Details: {selectedPerson.fullName} {selectedPerson.externalRef ? `(${selectedPerson.externalRef})` : ''}
              </h2>
              <button className="modal-close" onClick={() => setShowSessionsModal(false)}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Showing all recorded sessions for the selected date range ({startDate} to {endDate}).
            </div>

            {sessionsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading sessions...</div>
            ) : (
              <div className="data-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personSessions.map(session => (
                      <tr key={session.sessionId}>
                        <td>{session.workDate}</td>
                        <td>{formatTime(session.checkInAt)} {session.isLate && <span className="badge badge-warning" style={{fontSize: '0.6rem'}}>LATE</span>}</td>
                        <td>{session.checkOutAt ? formatTime(session.checkOutAt) : '-'}</td>
                        <td>{formatMinutesToHours(session.durationMinutes)}</td>
                        <td>
                          <span className={`badge badge-${session.status === 'CLOSED' ? 'success' : session.status === 'AUTO_CLOSED' ? 'danger' : 'primary'}`}>
                            {session.status === 'AUTO_CLOSED' ? 'Missed check-out' : session.status}
                          </span>
                        </td>
                        <td>
                          {(session.status === 'AUTO_CLOSED' || session.status === 'OPEN') && (
                            <button 
                              className="icon-btn-small text-primary" 
                              title="Correct Session"
                              onClick={() => {
                                setCorrectionMode(session.sessionId);
                                setCorrectionForm({ 
                                  checkOutAt: session.checkOutAt ? session.checkOutAt.substring(0, 16) : new Date().toISOString().substring(0, 16),
                                  correctionReason: '' 
                                });
                              }}
                            >
                              <ZenvEditIcon size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {personSessions.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{textAlign: 'center'}} className="text-muted">No sessions recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {correctionMode && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--border-radius)' }}>
                <h4>Correct Session (ID: {correctionMode})</h4>
                <form onSubmit={handleCorrectionSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Correct Check-Out Time</label>
                    <input 
                      type="datetime-local" 
                      className="form-control" 
                      value={correctionForm.checkOutAt} 
                      onChange={e => setCorrectionForm({...correctionForm, checkOutAt: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <label className="form-label">Reason for Correction</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Forgot to tap out, system error"
                      value={correctionForm.correctionReason} 
                      onChange={e => setCorrectionForm({...correctionForm, correctionReason: e.target.value})} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Apply</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setCorrectionMode(null)}>Cancel</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {showAbsencesModal && selectedAbsencePerson && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '550px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Absence Breakdown: {selectedAbsencePerson.fullName} {selectedAbsencePerson.externalRef ? `(${selectedAbsencePerson.externalRef})` : ''}
              </h2>
              <button className="modal-close" onClick={() => setShowAbsencesModal(false)}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--border-radius)', color: '#991b1b' }}>
              <strong>Total Missed Working Days: {selectedAbsencePerson.absentDays}</strong> (Period: {startDate} to {endDate})
            </div>

            <div className="data-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedAbsencePerson.absentDates || []).map((dateStr, idx) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                    return (
                      <tr key={idx}>
                        <td className="text-muted">{idx + 1}</td>
                        <td className="font-medium">{dateStr}</td>
                        <td>{dayName}</td>
                        <td><span className="badge badge-danger">ABSENT</span></td>
                      </tr>
                    );
                  })}
                  {(!selectedAbsencePerson.absentDates || selectedAbsencePerson.absentDates.length === 0) && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }} className="text-muted">No absences recorded in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setShowAbsencesModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
