import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Search } from 'lucide-react';
import api from '../utils/api';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/audit-log?size=100');
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        setLogs(data?.content || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.actionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actorRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetEntity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p className="text-muted">Track system events and administrative actions.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs}>
          <RefreshCw size={18} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="search-bar table-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search logs by action, user, or details..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading audit logs...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Performed By</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.logId}>
                    <td className="font-medium" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-warning">
                        {log.actionType}
                      </span>
                    </td>
                    <td>{log.targetEntity || 'N/A'}</td>
                    <td className="font-medium">{log.actorRole} {log.actorId ? `(ID: ${log.actorId})` : ''}</td>
                    <td><span className="text-muted">{log.targetId ? `Target ID: ${log.targetId}` : '-'}</span></td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center'}} className="text-muted">No audit logs found.</td>
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
