import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  ZenvPlusIcon,
  ZenvSearchIcon,
  ZenvEditIcon,
  ZenvBanIcon,
  ZenvCheckIcon,
  ZenvAlertIcon,
  ZenvIdCardIcon
} from '../components/ZenvIcons';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRefresh, useAutoRefresh } from '../context/RefreshContext';
import './People.css';

export function People() {
  const { user } = useAuth();
  const toast = useToast();
  const { triggerRefresh } = useRefresh();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [searchTerm, setSearchTerm] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [personToComplete, setPersonToComplete] = useState(null);
  const [personToRelease, setPersonToRelease] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState({
    fullName: '',
    memberType: 'EMPLOYEE',
    externalRef: '',
    groupLabel: '',
    email: '',
    phone: ''
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    memberType: 'EMPLOYEE',
    externalRef: '',
    groupLabel: '',
    email: '',
    phone: ''
  });

  const fetchPeople = useCallback(async () => {
    if (user?.passwordChangeRequired) return;
    try {
      const data = await api.get('/people');
      setPeople(data || []);
    } catch (err) {
      console.error('Failed to fetch people', err);
    } finally {
      setLoading(false);
    }
  }, [user?.passwordChangeRequired]);

  useAutoRefresh(fetchPeople, { intervalMs: 10000 });

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
      toast.success('Person registered successfully!');
      triggerRefresh();
    } catch (err) {
      setError(err?.message || 'Failed to add person');
      toast.error(err?.message || 'Failed to add person');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (person) => {
    setSelectedPerson(person);
    setEditFormData({
      fullName: person.fullName || '',
      memberType: person.memberType || 'EMPLOYEE',
      externalRef: person.externalRef || '',
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
      toast.success('Person details updated successfully!');
      triggerRefresh();
    } catch (err) {
      setError(err?.message || 'Failed to update person');
      toast.error(err?.message || 'Failed to update person');
    }
  };

  const handleToggleStatus = async (personId, currentStatus) => {
    if (!isManagerOrAdmin) {
      return toast.warning("Only Managers and Admins can update personnel status.");
    }
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/people/${personId}`, { status: nextStatus });
      toast.success(`Person status changed to ${nextStatus}`);
      triggerRefresh();
    } catch (err) {
      toast.error(err?.message || 'Failed to change status');
    }
  };

  const handleMarkCompleted = (person) => {
    if (!isManagerOrAdmin) {
      return toast.warning("Only Managers and Admins can complete candidate tenure.");
    }
    setPersonToComplete(person);
  };

  const confirmMarkCompleted = async () => {
    if (!personToComplete) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/people/${personToComplete.personId}`, { status: 'COMPLETED' });
      toast.success(`${personToComplete.fullName} marked as COMPLETED. Card released.`);
      setPersonToComplete(null);
      triggerRefresh();
    } catch (err) {
      toast.error(err?.message || 'Failed to complete candidate tenure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignModal = async (person) => {
    if (person.status === 'COMPLETED') {
      return toast.warning("Completed candidate is not eligible for card assignment.");
    }
    if (person.status !== 'ACTIVE') {
      return toast.warning("Cannot assign card to an inactive candidate.");
    }
    setSelectedPerson(person);
    setError('');
    try {
      const cards = await api.get('/cards');
      const available = (cards || []).filter(c => c.status === 'AVAILABLE');
      setAvailableCards(available);
      setShowAssignModal(true);
    } catch (err) {
      console.error("Failed to load available cards", err);
      toast.error("Failed to load available cards");
    }
  };

  const handleAssignCard = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedCardId) return setError("Please select a card");

    try {
      await api.post('/mappings', { personId: selectedPerson.personId, cardId: parseInt(selectedCardId) });
      setShowAssignModal(false);
      toast.success("Card successfully mapped!");
      triggerRefresh();
    } catch (err) {
      setError(err?.message || 'Failed to assign card');
      toast.error(err?.message || 'Failed to assign card');
    }
  };

  const handleReleaseCard = (person) => {
    setPersonToRelease(person);
  };

  const confirmReleaseCard = async () => {
    if (!personToRelease) return;
    setIsSubmitting(true);
    try {
      await api.post(`/mappings/${personToRelease.activeMappingId}/release`);
      toast.success("Card successfully released!");
      setPersonToRelease(null);
      triggerRefresh();
    } catch (err) {
      toast.error(err?.message || 'Failed to release card');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [memberTypeFilter, setMemberTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // Default: Active
  const [cardFilter, setCardFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'

  // Extract unique member types (EMPLOYEE & STUDENT only)
  const uniqueMemberTypes = Array.from(new Set([
    'EMPLOYEE', 'STUDENT',
    ...people.map(p => p.memberType).filter(t => t === 'EMPLOYEE' || t === 'STUDENT')
  ])).sort();

  // Dynamically scope people by the selected status so Type and Card counts match the Status filter count
  const peopleInSelectedStatus = people.filter(p => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  const assignedCount = peopleInSelectedStatus.filter(p => !!p.assignedCardUid).length;
  const unassignedCount = peopleInSelectedStatus.filter(p => !p.assignedCardUid).length;

  const filteredPeople = people.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      p.fullName?.toLowerCase().includes(term) ||
      p.personId?.toString().includes(term) ||
      p.externalRef?.toLowerCase().includes(term) ||
      p.groupLabel?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.phone?.includes(term) ||
      p.assignedCardUid?.toLowerCase().includes(term)
    );
    const matchesType = memberTypeFilter === 'ALL' || p.memberType === memberTypeFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesCard = cardFilter === 'ALL' ||
      (cardFilter === 'ASSIGNED' && !!p.assignedCardUid) ||
      (cardFilter === 'UNASSIGNED' && !p.assignedCardUid);

    return matchesSearch && matchesType && matchesStatus && matchesCard;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>People Management</h1>
          <p className="text-muted">Manage employees and students.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({ fullName: '', memberType: 'EMPLOYEE', externalRef: '', groupLabel: '', email: '', phone: '' });
          setError('');
          setShowModal(true);
        }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ZenvPlusIcon size={18} />
          <span>Add Person</span>
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div className="search-bar table-search" style={{ flex: '1 1 250px' }}>
            <ZenvSearchIcon size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, student ID, team, email, card..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Dynamic Dropdown Select for Member Types & Status Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '150px' }}
                value={memberTypeFilter}
                onChange={(e) => setMemberTypeFilter(e.target.value)}
              >
                <option value="ALL">All Types ({peopleInSelectedStatus.length})</option>
                {uniqueMemberTypes.map(t => {
                  const count = peopleInSelectedStatus.filter(p => p.memberType === t).length;
                  return (
                    <option key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '135px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ACTIVE">Active ({people.filter(p => p.status === 'ACTIVE').length})</option>
                <option value="COMPLETED">Completed ({people.filter(p => p.status === 'COMPLETED').length})</option>
                <option value="INACTIVE">Inactive ({people.filter(p => p.status === 'INACTIVE').length})</option>
                <option value="ALL">All Status ({people.length})</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Card:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '145px' }}
                value={cardFilter}
                onChange={(e) => setCardFilter(e.target.value)}
              >
                <option value="ALL">All Cards ({peopleInSelectedStatus.length})</option>
                <option value="ASSIGNED">Assigned ({assignedCount})</option>
                <option value="UNASSIGNED">Unassigned ({unassignedCount})</option>
              </select>
            </div>
          </div>
        </div>

        <div className="data-table-container people-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading people...</div>
          ) : (
            <table className="data-table people-table">
              <colgroup>
                <col style={{ width: '60px' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Team</th>
                  <th>Contact Info</th>
                  <th>Assigned Card</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person, idx) => {
                  const isUpward = idx >= filteredPeople.length - 2 && filteredPeople.length > 2;
                  const isMenuOpen = activeDropdownId === person.personId;

                  return (
                    <tr key={person.personId}>
                      <td className="font-medium">#{person.personId}</td>
                      <td>
                        <div className="person-name-cell">
                          <div className="avatar-small">{person.fullName?.charAt(0) || '?'}</div>
                          <span title={person.fullName}>{person.fullName}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '600',
                          fontSize: '0.82rem',
                          background: '#f1f5f9',
                          color: '#0f172a',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          display: 'inline-block'
                        }}>
                          {person.externalRef || `EXT-${String(person.personId).padStart(4, '0')}`}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${person.memberType === 'STUDENT' ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '0.75rem', letterSpacing: '0.02em', padding: '3px 8px' }}>
                          {person.memberType || 'EMPLOYEE'}
                        </span>
                      </td>
                      <td>{person.groupLabel}</td>
                      <td>
                        <div className="contact-info-cell">
                          <span className="contact-email" title={person.email}>{person.email || '-'}</span>
                          <span className="contact-phone">{person.phone || '-'}</span>
                        </div>
                      </td>
                      <td>
                        {person.assignedCardUid ? (
                          <span style={{ 
                            fontSize: '0.82rem', 
                            fontFamily: 'monospace', 
                            fontWeight: 600,
                            color: '#0f172a',
                            background: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            display: 'inline-block'
                          }}>
                            {person.assignedCardUid}
                          </span>
                        ) : (
                          <span className="badge" style={{ 
                            background: 'rgba(151, 144, 133, 0.12)', 
                            color: '#78716c', 
                            border: '1px dashed #cbd5e1',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 7px'
                          }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${person.status === 'ACTIVE' ? 'badge-success' :
                          person.status === 'COMPLETED' ? 'badge-secondary' : 'badge-danger'
                          }`} style={person.status === 'COMPLETED' ? { background: '#979085', color: '#ffffff' } : {}}>
                          {person.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', overflow: 'visible' }}>
                        <div className="actions-dropdown-container">
                          <button
                            type="button"
                            className={`actions-dropdown-btn ${isMenuOpen ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(isMenuOpen ? null : person.personId);
                            }}
                            title="Actions menu"
                          >
                            <span>Actions</span>
                            <span style={{ fontSize: '0.62rem', transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                              ▼
                            </span>
                          </button>

                          {isMenuOpen && (
                            <div
                              className={`actions-dropdown-menu ${isUpward ? 'open-upward' : ''}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Action 1: Assign or Release Card */}
                              {person.assignedCardUid ? (
                                <button
                                  type="button"
                                  className="actions-dropdown-item item-danger"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleReleaseCard(person);
                                  }}
                                >
                                  <X size={15} />
                                  <span>Release Card</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="actions-dropdown-item item-primary"
                                  disabled={person.status !== 'ACTIVE'}
                                  style={person.status !== 'ACTIVE' ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                                  onClick={() => {
                                    if (person.status === 'ACTIVE') {
                                      setActiveDropdownId(null);
                                      openAssignModal(person);
                                    }
                                  }}
                                  title={person.status !== 'ACTIVE' ? "Cannot assign cards to inactive or completed members" : "Assign Card"}
                                >
                                  <ZenvIdCardIcon size={15} />
                                  <span>Assign Card</span>
                                </button>
                              )}

                              {/* Action 2: Edit Person Details */}
                              <button
                                type="button"
                                className="actions-dropdown-item item-primary"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  openEditModal(person);
                                }}
                              >
                                <ZenvEditIcon size={15} />
                                <span>Edit Details</span>
                              </button>

                              {isManagerOrAdmin && person.status !== 'COMPLETED' && (
                                <>
                                  <div className="actions-dropdown-divider" />

                                  {/* Action 3: Toggle Status (Deactivate / Activate) */}
                                  <button
                                    type="button"
                                    className={`actions-dropdown-item ${person.status === 'ACTIVE' ? 'item-danger' : 'item-success'}`}
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleToggleStatus(person.personId, person.status);
                                    }}
                                  >
                                    {person.status === 'ACTIVE' ? <ZenvBanIcon size={15} /> : <ZenvCheckIcon size={15} />}
                                    <span>{person.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
                                  </button>

                                  {/* Action 4: Mark Membership Completed */}
                                  <button
                                    type="button"
                                    className="actions-dropdown-item item-warning"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleMarkCompleted(person);
                                    }}
                                  >
                                    <ZenvCheckIcon size={15} />
                                    <span>Mark Completed</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPeople.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center' }} className="text-muted">No people found.</td>
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
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Member Type</label>
                <select
                  className="form-control"
                  value={formData.memberType}
                  onChange={(e) => setFormData({ ...formData, memberType: e.target.value })}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {formData.memberType === 'STUDENT' ? 'ID *' : 'ID'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.externalRef}
                  onChange={(e) => setFormData({ ...formData, externalRef: e.target.value })}
                  placeholder={formData.memberType === 'STUDENT' ? 'e.g. STU1001' : 'e.g. EMP1001 (Optional)'}
                  pattern="^[a-zA-Z0-9_\-]{3,20}$"
                  title="3 to 20 characters (letters, numbers, hyphens, underscores)"
                  required={formData.memberType === 'STUDENT'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Team / Department</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.groupLabel}
                  onChange={(e) => setFormData({ ...formData, groupLabel: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                      setFormData({ ...formData, phone: val });
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
                  <p className="text-danger" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>No available cards. Please register a new card first.</p>
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
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Member Type</label>
                <select
                  className="form-control"
                  value={editFormData.memberType}
                  onChange={(e) => setEditFormData({ ...editFormData, memberType: e.target.value })}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {editFormData.memberType === 'STUDENT' ? 'ID *' : 'ID'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.externalRef}
                  onChange={(e) => setEditFormData({ ...editFormData, externalRef: e.target.value })}
                  placeholder={editFormData.memberType === 'STUDENT' ? 'e.g. STU1001' : 'e.g. EMP1001 (Optional)'}
                  pattern="^[a-zA-Z0-9_\-]{3,20}$"
                  title="3 to 20 characters (letters, numbers, hyphens, underscores)"
                  required={editFormData.memberType === 'STUDENT'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Team / Department</label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.groupLabel}
                  onChange={(e) => setEditFormData({ ...editFormData, groupLabel: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  className="form-control"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
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
                      setEditFormData({ ...editFormData, phone: val });
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

      {/* Custom Modal: Mark Candidate as COMPLETED */}
      {personToComplete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '420px', borderRadius: 'var(--border-radius-sm, 2px)' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                Mark as Completed
              </h2>
              <button className="modal-close" onClick={() => setPersonToComplete(null)}><X size={20} /></button>
            </div>

            <div style={{ padding: '1rem 0', fontSize: '0.9rem', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
              <p style={{ margin: 0 }}>
                Are you sure you want to mark <strong>{personToComplete.fullName}</strong> as <strong>COMPLETED</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.6rem', marginBottom: 0 }}>
                Their assigned card will be released back to available inventory, and no further cards can be assigned.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPersonToComplete(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--color-primary)' }}
                onClick={confirmMarkCompleted}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Mark Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal: Release Card Confirmation */}
      {personToRelease && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '440px', borderRadius: 'var(--border-radius-sm, 2px)', border: '1px solid var(--color-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '2px',
                  background: 'rgba(16, 43, 76, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  flexShrink: 0
                }}>
                  <ZenvIdCardIcon size={20} />
                </div>
                <div>
                  <h2 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
                    Release RFID Card
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CARD UNASSIGNMENT</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setPersonToRelease(null)}><X size={20} /></button>
            </div>

            <div style={{ padding: '1rem 0', fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
              <p style={{ margin: '0 0 0.65rem 0' }}>
                Are you sure you want to release card <strong style={{ fontFamily: 'monospace' }}>{personToRelease.assignedCardUid}</strong> currently mapped to <strong>{personToRelease.fullName}</strong>?
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
                The RFID card will be reset to <strong>AVAILABLE</strong> status so it can be assigned to another candidate.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPersonToRelease(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmReleaseCard}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Releasing...' : 'Release Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

