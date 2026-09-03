import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ZenvPlusIcon, ZenvSearchIcon, ZenvBanIcon, ZenvAlertIcon, ZenvIdCardIcon, ZenvCheckIcon } from '../components/ZenvIcons';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRefresh, useAutoRefresh } from '../context/RefreshContext';

export function Cards() {
  const { user } = useAuth();
  const toast = useToast();
  const { triggerRefresh } = useRefresh();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCardUid, setNewCardUid] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ACTIVE' (Default) | 'INACTIVE' | 'ALL'
  const [assignmentFilter, setAssignmentFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'
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

  const fetchCards = useCallback(async () => {
    if (user?.passwordChangeRequired) return;
    try {
      const data = await api.get('/cards');
      setCards(data || []);
    } catch (err) {
      console.error('Failed to fetch cards', err);
    } finally {
      setLoading(false);
    }
  }, [user?.passwordChangeRequired]);

  useAutoRefresh(fetchCards, { intervalMs: 10000 });

  const handleRegisterCard = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/cards', { cardUid: newCardUid });
      setShowModal(false);
      setNewCardUid('');
      toast.success('RFID Card registered successfully!');
      triggerRefresh();
    } catch (err) {
      setError(err?.message || 'Failed to register card');
      toast.error(err?.message || 'Failed to register card');
    }
  };

  const [cardStatusToUpdate, setCardStatusToUpdate] = useState(null);

  const handleRequestStatusChange = (card, newStatus) => {
    if (!isManagerOrAdmin) return toast.warning("Only Managers and Admins can update card status.");
    setCardStatusToUpdate({ card, newStatus });
  };

  const confirmUpdateCardStatus = async () => {
    if (!cardStatusToUpdate) return;
    try {
      await api.patch(`/cards/${cardStatusToUpdate.card.cardId}`, { status: cardStatusToUpdate.newStatus });
      toast.success(`Card status updated to ${cardStatusToUpdate.newStatus}`);
      setCardStatusToUpdate(null);
      triggerRefresh();
    } catch (err) {
      toast.error(err?.message || 'Failed to update card status');
    }
  };

  const activeCount = cards.filter(c => c.status === 'AVAILABLE' || c.status === 'ASSIGNED').length;
  const inactiveCount = cards.filter(c => c.status === 'DEACTIVATED' || c.status === 'LOST').length;

  // Scope cards by selected status so Assignment counts match the active status view
  const cardsInSelectedStatus = cards.filter(c => {
    const isActive = c.status === 'AVAILABLE' || c.status === 'ASSIGNED';
    const isInactive = c.status === 'DEACTIVATED' || c.status === 'LOST';
    if (statusFilter === 'ACTIVE') return isActive;
    if (statusFilter === 'INACTIVE') return isInactive;
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  const assignedCount = cardsInSelectedStatus.filter(c => c.status === 'ASSIGNED' || !!c.assignedPersonId).length;
  const unassignedCount = cardsInSelectedStatus.filter(c => c.status !== 'ASSIGNED' && !c.assignedPersonId).length;

  const filteredCards = cards.filter(c => {
    const matchesSearch = c.cardUid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.cardId?.toString().includes(searchTerm) ||
                          c.assignedPersonName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.assignedPersonExternalRef?.toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = c.status === 'AVAILABLE' || c.status === 'ASSIGNED';
    const isInactive = c.status === 'DEACTIVATED' || c.status === 'LOST';

    const matchesStatus = (statusFilter === 'ALL') ||
                          (statusFilter === 'ACTIVE' && isActive) ||
                          (statusFilter === 'INACTIVE' && isInactive) ||
                          (c.status === statusFilter);

    const isAssigned = c.status === 'ASSIGNED' || !!c.assignedPersonId;
    const matchesAssignment = (assignmentFilter === 'ALL') ||
                              (assignmentFilter === 'ASSIGNED' && isAssigned) ||
                              (assignmentFilter === 'UNASSIGNED' && !isAssigned);

    return matchesSearch && matchesStatus && matchesAssignment;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Card Management</h1>
          <p className="text-muted">Manage RFID cards and their assignments.</p>
        </div>
        {isManagerOrAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ZenvPlusIcon size={18} />
            <span>Register New Card</span>
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="search-bar table-search" style={{ flex: '1 1 240px', minWidth: '200px' }}>
            <ZenvSearchIcon size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search cards by UID or name..." 
              className="search-input" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status Filter Dropdown (Default: Active) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '140px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ACTIVE">Active ({activeCount})</option>
                <option value="INACTIVE">Inactive ({inactiveCount})</option>
                <option value="ALL">All Status ({cards.length})</option>
              </select>
            </div>

            {/* Assignment Filter Dropdown (All, Assigned, Unassigned) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Assignment:</span>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '150px' }}
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
              >
                <option value="ALL">All Cards ({cardsInSelectedStatus.length})</option>
                <option value="ASSIGNED">Assigned ({assignedCount})</option>
                <option value="UNASSIGNED">Unassigned ({unassignedCount})</option>
              </select>
            </div>
          </div>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading cards...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Card ID</th>
                  <th>Card UID</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  {isManagerOrAdmin && <th style={{ width: '105px', textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((c, idx) => {
                  const isUpward = idx >= filteredCards.length - 2 && filteredCards.length > 2;
                  const isMenuOpen = activeDropdownId === c.cardId;

                  return (
                    <tr key={c.cardId}>
                      <td className="font-medium">#{c.cardId}</td>
                      <td><span style={{ fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 600 }}>{c.cardUid}</span></td>
                      <td>
                        <span className={`badge badge-${
                          c.status === 'AVAILABLE' ? 'success' : 
                          c.status === 'ASSIGNED' ? 'primary' : 
                          c.status === 'LOST' ? 'warning' : 'danger'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.assignedPersonName ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{c.assignedPersonName}</span>
                            <span style={{ 
                              fontFamily: 'monospace',
                              fontWeight: '600',
                              fontSize: '0.75rem',
                              background: '#f1f5f9',
                              color: '#0f172a',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              display: 'inline-block',
                              width: 'fit-content'
                            }}>
                              {c.assignedPersonExternalRef || `EXT-${String(c.assignedPersonId).padStart(4, '0')}`}
                            </span>
                          </div>
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
                      {isManagerOrAdmin && (
                        <td style={{ textAlign: 'center', overflow: 'visible' }}>
                          <div className="actions-dropdown-container">
                            <button
                              type="button"
                              className={`actions-dropdown-btn ${isMenuOpen ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(isMenuOpen ? null : c.cardId);
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
                                {(c.status === 'AVAILABLE' || c.status === 'ASSIGNED') && (
                                  <>
                                    <button
                                      type="button"
                                      className="actions-dropdown-item item-warning"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        handleRequestStatusChange(c, 'LOST');
                                      }}
                                    >
                                      <ZenvAlertIcon size={15} />
                                      <span>Mark Lost</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="actions-dropdown-item item-danger"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        handleRequestStatusChange(c, 'DEACTIVATED');
                                      }}
                                    >
                                      <ZenvBanIcon size={15} />
                                      <span>Deactivate Card</span>
                                    </button>
                                  </>
                                )}

                                {c.status === 'DEACTIVATED' && user?.role === 'ADMIN' && (
                                  <button
                                    type="button"
                                    className="actions-dropdown-item item-success"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleRequestStatusChange(c, 'AVAILABLE');
                                    }}
                                  >
                                    <ZenvCheckIcon size={15} />
                                    <span>Reactivate Card</span>
                                  </button>
                                )}

                                {c.status === 'LOST' && (
                                  <div style={{ padding: '0.5rem 0.85rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                    Permanently Disabled
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredCards.length === 0 && (
                  <tr>
                    <td colSpan={isManagerOrAdmin ? "5" : "4"} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                      {assignmentFilter === 'ASSIGNED' 
                        ? 'No assigned cards found.' 
                        : assignmentFilter === 'UNASSIGNED' 
                        ? 'No unassigned cards found.' 
                        : 'No cards found.'}
                    </td>
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
              <h2 className="modal-title">Register New Card</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleRegisterCard}>
              <div className="form-group">
                <label className="form-label">Card UID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 04A1B2C3D4" 
                  value={newCardUid}
                  onChange={(e) => setNewCardUid(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Modal: Card Status Change */}
      {cardStatusToUpdate && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '440px', borderRadius: 'var(--border-radius-sm, 2px)', border: '1px solid var(--color-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ 
                  width: '34px', 
                  height: '34px', 
                  borderRadius: '2px', 
                  background: cardStatusToUpdate.newStatus === 'LOST' || cardStatusToUpdate.newStatus === 'DEACTIVATED' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 43, 76, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: cardStatusToUpdate.newStatus === 'LOST' || cardStatusToUpdate.newStatus === 'DEACTIVATED' ? 'var(--color-danger, #ef4444)' : 'var(--color-primary)',
                  flexShrink: 0
                }}>
                  {cardStatusToUpdate.newStatus === 'LOST' ? <ZenvAlertIcon size={20} /> : <ZenvIdCardIcon size={20} />}
                </div>
                <div>
                  <h2 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
                    Update Card Status
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CARD LIFECYCLE MANAGEMENT</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setCardStatusToUpdate(null)}><X size={20} /></button>
            </div>

            <div style={{ padding: '1rem 0', fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
              <p style={{ margin: '0 0 0.65rem 0' }}>
                Are you sure you want to change status of card <strong style={{ fontFamily: 'monospace' }}>{cardStatusToUpdate.card.cardUid}</strong> to <span className={`badge badge-${cardStatusToUpdate.newStatus === 'AVAILABLE' ? 'success' : cardStatusToUpdate.newStatus === 'LOST' ? 'warning' : 'danger'}`}>{cardStatusToUpdate.newStatus}</span>?
              </p>
              {cardStatusToUpdate.newStatus === 'LOST' && (
                <p style={{ fontSize: '0.82rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.65rem', borderRadius: '2px', margin: 0 }}>
                  Marking a card as LOST will permanently disable it and immediately prevent any door access or check-ins.
                </p>
              )}
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setCardStatusToUpdate(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={confirmUpdateCardStatus}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
