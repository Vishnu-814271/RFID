import React, { useState, useEffect } from 'react';
import { Download, Filter, Search, Calendar, FileText, Edit, X } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/dateUtils';

export function Reports() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberType, setSelectedMemberType] = useState('ALL');
  const [selectedGroupLabel, setSelectedGroupLabel] = useState('ALL');
  const [selectedPersonId, setSelectedPersonId] = useState('ALL');
  
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personSessions, setPersonSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  const [correctionMode, setCorrectionMode] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({ checkOutAt: '', correctionReason: '' });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/attendance/report?startDate=${startDate}&endDate=${endDate}`);
      setReportData(data || []);
    } catch (err) {
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.passwordChangeRequired) {
      fetchReport();
    }
  }, [startDate, endDate, user?.passwordChangeRequired]);

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
    } catch (err) {
      alert("Failed to download CSV");
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
      alert("Failed to load sessions");
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
      alert("Session corrected successfully.");
    } catch (err) {
      alert(err.message || "Failed to correct session");
    }
  };

  const uniqueGroupLabels = Array.from(new Set(reportData.map(row => row.groupLabel).filter(Boolean))).sort();
  const uniquePeople = reportData.map(row => ({ personId: row.personId, fullName: row.fullName })).sort((a, b) => a.fullName.localeCompare(b.fullName));

  const filteredData = reportData.filter(row => {
    const matchesSearch = searchTerm === '' || 
      row.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.groupLabel?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesMemberType = selectedMemberType === 'ALL' || row.memberType === selectedMemberType;
    const matchesGroupLabel = selectedGroupLabel === 'ALL' || row.groupLabel === selectedGroupLabel;
    const matchesPerson = selectedPersonId === 'ALL' || String(row.personId) === selectedPersonId;
    
    return matchesSearch && matchesMemberType && matchesGroupLabel && matchesPerson;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Attendance Reports</h1>
          <p className="text-muted">Generate, view, and export attendance data.</p>
        </div>
        <button className="btn btn-primary" onClick={handleExportCSV}>
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="search-bar table-search" style={{ flex: '1 1 200px', marginBottom: 0 }}>
            <Search size={18} className="search-icon" />
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
                style={{ padding: '0.25rem 0.5rem', minWidth: '120px' }}
                value={selectedMemberType}
                onChange={(e) => {
                  setSelectedMemberType(e.target.value);
                  setSelectedPersonId('ALL'); // Reset person filter when type changes
                }}
              >
                <option value="ALL">All Types</option>
                <option value="STUDENT">Student</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>

            {/* Group Label Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Group:</span>
              <select 
                className="form-control" 
                style={{ padding: '0.25rem 0.5rem', minWidth: '120px' }}
                value={selectedGroupLabel}
                onChange={(e) => {
                  setSelectedGroupLabel(e.target.value);
                  setSelectedPersonId('ALL'); // Reset person filter when group changes
                }}
              >
                <option value="ALL">All Groups</option>
                {uniqueGroupLabels.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            {/* Person Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Person:</span>
              <select 
                className="form-control" 
                style={{ padding: '0.25rem 0.5rem', minWidth: '150px' }}
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
              >
                <option value="ALL">All People</option>
                {uniquePeople
                  .filter(p => {
                    const row = reportData.find(r => r.personId === p.personId);
                    if (!row) return false;
                    const matchesType = selectedMemberType === 'ALL' || row.memberType === selectedMemberType;
                    const matchesGroup = selectedGroupLabel === 'ALL' || row.groupLabel === selectedGroupLabel;
                    return matchesType && matchesGroup;
                  })
                  .map(person => (
                    <option key={person.personId} value={String(person.personId)}>{person.fullName}</option>
                  ))
                }
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
            </div>
            <span className="text-muted">to</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} className="text-muted" />
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
                  <th>Name</th>
                  <th>Type</th>
                  <th>Group</th>
                  <th>Present</th>
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
                    <td className="font-medium">{row.fullName || 'N/A'}</td>
                    <td>{row.memberType || 'N/A'}</td>
                    <td>{row.groupLabel || 'N/A'}</td>
                    <td><span className="text-success font-medium">{row.daysPresent || 0}</span></td>
                    <td><span className="text-danger font-medium">{row.absentDays || 0}</span></td>
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
                    <td>{row.totalHours || 0} hrs</td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => openSessionsModal(row)}>
                        <FileText size={14} style={{ marginRight: '4px' }}/> Sessions
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{textAlign: 'center'}} className="text-muted">No report data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showSessionsModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Attendance Sessions: {selectedPerson?.fullName}</h2>
              <button className="modal-close" onClick={() => setShowSessionsModal(false)}><X size={20} /></button>
            </div>
            
            {sessionsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading sessions...</div>
            ) : (
              <div className="data-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Duration (m)</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personSessions.map(session => (
                      <tr key={session.sessionId}>
                        <td>{session.workDate}</td>
                        <td>{formatTime(session.checkInAt)} {session.isLate && <span className="badge badge-warning" style={{fontSize: '0.6rem'}}>LATE</span>}</td>
                        <td>{session.checkOutAt ? formatTime(session.checkOutAt) : '-'}</td>
                        <td>{session.durationMinutes ?? '-'}</td>
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
                              <Edit size={16} />
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
    </div>
  );
}
