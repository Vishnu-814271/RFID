import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Ban, CheckCircle, CreditCard, X, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './People.css';

export function People() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    memberType: 'EMPLOYEE',
    externalRef: '',
    groupLabel: '',
    email: '',
    phone: ''
  });

  const [editFormData, setEditFormData] = useState({
    groupLabel: '',
    email: '',
    phone: ''
  });

  const fetchPeople = async () => {
    try {
      const data = await api.get('/people');
      setPeople(data || []);
    } catch (err) {
      console.error('Failed to fetch people', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.passwordChangeRequired) {
      fetchPeople();
    }
  }, [user?.passwordChangeRequired]);

  const handleAddPerson = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.post('/people', formData);
      setShowModal(false);
      setFormData({
        fullName: '',
        memberType: 'EMPLOYEE',
        externalRef: '',
        groupLabel: '',
        email: '',
        phone: ''
      });
      fetchPeople();
    } catch (err) {
      setError(err?.message || 'Failed to add person');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (person) => {
    setSelectedPerson(person);
    setEditFormData({
      groupLabel: person.groupLabel || '',
      email: person.email || '',
      phone: person.phone || ''
    });
    setError('');
    setShowEditModal(true);
  };

  const handleEditPerson = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.patch(`/people/${selectedPerson.personId}`, editFormData);
      setShowEditModal(false);
      fetchPeople();
    } catch (err) {
      setError(err?.message || 'Failed to update person');
    }
  };

  const handleToggleStatus = async (personId, currentStatus) => {
    if (!isManagerOrAdmin) {
      return alert("Only Managers and Admins can deactivate personnel.");
    }
    try {
      await api.patch(`/people/${personId}`, { status: currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      fetchPeople();
    } catch (err) {
      alert(err?.message || 'Failed to change status');
    }
  };

  const handleDeletePerson = async (personId) => {
    if (!window.confirm('Are you sure you want to delete this person?')) return;
    try {
      await api.delete(`/people/${personId}`);
    } catch (err) {
      alert(err?.message || 'Failed to delete person');
    }
  };


  const openAssignModal = async (person) => {
    setSelectedPerson(person);
    setError('');
    try {
      const cards = await api.get('/cards');
      const available = (cards || []).filter(c => c.status === 'AVAILABLE');
      setAvailableCards(available);
      setShowAssignModal(true);
    } catch (err) {
      alert("Failed to load cards");
    }
  };

  const handleAssignCard = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedCardId) return setError("Please select a card");
    
    try {
      await api.post('/mappings', { personId: selectedPerson.personId, cardId: parseInt(selectedCardId) });
      setShowAssignModal(false);
      fetchPeople();
      alert("Card successfully mapped!");
    } catch (err) {
      setError(err?.message || 'Failed to assign card');
    }
  };

  const handleReleaseCard = async (person) => {
    if (!window.confirm(`Are you sure you want to release the card assigned to ${person.fullName}?`)) return;
    try {
      await api.post(`/mappings/${person.activeMappingId}/release`);
      fetchPeople();
      alert("Card successfully released!");
    } catch (err) {
      alert(err?.message || 'Failed to release card');
    }
  };

  const filteredPeople = people.filter(p => 
    p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.personId?.toString().includes(searchTerm)
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>People Management</h1>
          <p className="text-muted">Manage employees, contractors, and visitors.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          <span>Add Person</span>
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="search-bar table-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search people..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading people...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Ext. ID</th>
                  <th>Type</th>
                  <th>Group</th>
                  {isManagerOrAdmin && <th>Contact Info</th>}
                  <th>Assigned Card</th>
                  <th>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map(person => (
                  <tr key={person.personId}>
                    <td className="font-medium">{person.personId}</td>
                    <td>
                      <div className="person-name-cell">
                        <div className="avatar-small">{person.fullName?.charAt(0) || '?'}</div>
                        <span>{person.fullName}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{person.externalRef || '-'}</td>
                    <td>{person.memberType}</td>
                    <td>{person.groupLabel}</td>
                    {isManagerOrAdmin && (
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{person.email || '-'}</div>
                        <div className="text-muted">{person.phone || '-'}</div>
                      </td>
                    )}
                    <td>
                      {person.assignedCardUid ? (
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <CreditCard size={14} className="text-muted"/>
                          <span style={{fontSize: '0.9rem'}}>{person.assignedCardUid}</span>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${person.status === 'ACTIVE' ? 'success' : 'danger'}`}>
                        {person.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {person.assignedCardUid ? (
                          <button 
                            className="icon-btn-small text-danger" 
                            title="Release Card" 
                            onClick={() => handleReleaseCard(person)}
                          >
                            <X size={16} />
                          </button>
                        ) : (
                          <button 
                            className="icon-btn-small text-primary" 
                            title="Assign Card" 
                            onClick={() => openAssignModal(person)}
                          >
                            <CreditCard size={16} />
                          </button>
                        )}
                        {isManagerOrAdmin && (
                          <>
                            <button className="icon-btn-small text-primary" title="Edit" onClick={() => openEditModal(person)}>
                              <Edit size={16} />
                            </button>
                            <button 
                              className={`icon-btn-small ${person.status === 'ACTIVE' ? 'text-danger' : 'text-success'}`} 
                              title={person.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              onClick={() => handleToggleStatus(person.personId, person.status)}
                            >
                              {person.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle size={16} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPeople.length === 0 && (
                  <tr>
                    <td colSpan={isManagerOrAdmin ? "9" : "8"} style={{textAlign: 'center'}} className="text-muted">No people found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add Person</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleAddPerson}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Member Type</label>
                <select 
                  className="form-control" 
                  value={formData.memberType}
                  onChange={(e) => setFormData({...formData, memberType: e.target.value})}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {formData.memberType === 'STUDENT' ? 'Student ID *' : 'External Reference (ID)'}
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.externalRef}
                  onChange={(e) => setFormData({...formData, externalRef: e.target.value})}
                  pattern="^[a-zA-Z0-9]{7}$"
                  title="Must be exactly 7 alphanumeric characters"
                  required={formData.memberType === 'STUDENT'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Group / Department</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.groupLabel}
                  onChange={(e) => setFormData({...formData, groupLabel: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (Optional)</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 10) {
                      setFormData({...formData, phone: val});
                    }
                  }}
                  pattern="^\d{10}$"
                  title="Phone number must be exactly 10 digits"
                  maxLength={10}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Assign Card to {selectedPerson?.fullName}</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}><X size={20} /></button>
            </div>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleAssignCard}>
              <div className="form-group">
                <label className="form-label">Select Available Card</label>
                <select 
                  className="form-control" 
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  required
                >
                  <option value="" disabled>-- Select a Card --</option>
                  {availableCards.map(c => (
                    <option key={c.cardId} value={c.cardId}>
                      {c.cardUid} (ID: {c.cardId})
                    </option>
                  ))}
                </select>
                {availableCards.length === 0 && (
                  <p className="text-danger" style={{fontSize: '0.8rem', marginTop: '0.25rem'}}>No available cards. Please register a new card first.</p>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={availableCards.length === 0}>Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit {selectedPerson?.fullName}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleEditPerson}>
              <div className="form-group">
                <label className="form-label">Group / Department</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editFormData.groupLabel}
                  onChange={(e) => setEditFormData({...editFormData, groupLabel: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (Optional)</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={editFormData.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 10) {
                      setEditFormData({...editFormData, phone: val});
                    }
                  }}
                  pattern="^\d{10}$"
                  title="Phone number must be exactly 10 digits"
                  maxLength={10}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
