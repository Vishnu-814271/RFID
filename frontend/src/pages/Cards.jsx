import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Search, X, Ban, AlertTriangle } from 'lucide-react';
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
  const [cardToDelete, setCardToDelete] = useState(null);
  const [newCardUid, setNewCardUid] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ACTIVE' (Default) | 'INACTIVE' | 'ALL'

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

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;
    try {
      await api.delete(`/cards/${cardToDelete.id}`);
      setCardToDelete(null);
      toast.success('Card deleted successfully');
      triggerRefresh();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete card');
    }
  };

  const activeCount = cards.filter(c => c.status === 'AVAILABLE' || c.status === 'ASSIGNED').length;
  const inactiveCount = cards.filter(c => c.status === 'DEACTIVATED' || c.status === 'LOST').length;

  const filteredCards = cards.filter(c => {
    const matchesSearch = c.cardUid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.cardId?.toString().includes(searchTerm) ||
                          c.assignedPersonName?.toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = c.status === 'AVAILABLE' || c.status === 'ASSIGNED';
    const isInactive = c.status === 'DEACTIVATED' || c.status === 'LOST';

    const matchesStatus = (statusFilter === 'ALL') ||
                          (statusFilter === 'ACTIVE' && isActive) ||
                          (statusFilter === 'INACTIVE' && isInactive) ||
                          (c.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Card Management</h1>
          <p className="text-muted">Manage RFID cards and their assignments.</p>
        </div>
        {isManagerOrAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            <span>Register New Card</span>
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="search-bar table-search" style={{ flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search cards by UID or name..." 
              className="search-input" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter Dropdown (Default: Active) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status:</span>
            <select
              className="form-control"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', minWidth: '150px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ACTIVE">Active ({activeCount})</option>
              <option value="INACTIVE">Inactive ({inactiveCount})</option>
              <option value="ALL">All Cards ({cards.length})</option>
            </select>
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
                  {isManagerOrAdmin && <th style={{ width: '120px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCards.map(c => (
                  <tr key={c.cardId}>
                    <td className="font-medium">{c.cardId}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CreditCard size={16} className="text-muted"/> {c.cardUid}</div></td>
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
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    {isManagerOrAdmin && (
                      <td>
                        <div className="action-buttons">
                          {(c.status === 'AVAILABLE' || c.status === 'ASSIGNED') && (
                            <>
                              <button 
                                className="icon-btn-small text-warning" 
                                title="Mark Lost" 
                                onClick={() => handleRequestStatusChange(c, 'LOST')}
                              >
                                <AlertTriangle size={16} />
                              </button>
                              <button 
                                className="icon-btn-small text-danger" 
                                title="Deactivate" 
                                onClick={() => handleRequestStatusChange(c, 'DEACTIVATED')}
                              >
                                <Ban size={16} />
                              </button>
                            </>
                          )}
                          {c.status === 'DEACTIVATED' && user?.role === 'ADMIN' && (
                            <button 
                              className="btn btn-success" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              title="Reactivate Card"
                              onClick={() => handleRequestStatusChange(c, 'AVAILABLE')}
                            >
                              Reactivate
                            </button>
                          )}
                          {c.status === 'LOST' && (
                            <span className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                              Permanently Disabled
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredCards.length === 0 && (
                  <tr>
                    <td colSpan={isManagerOrAdmin ? "5" : "4"} style={{textAlign: 'center'}} className="text-muted">No cards found.</td>
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
                  value={newCardUid}
                  onChange={(e) => setNewCardUid(e.target.value)}
                  placeholder="Scan or enter Card UID..."
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
                  {cardStatusToUpdate.newStatus === 'LOST' ? <AlertTriangle size={20} /> : <CreditCard size={20} />}
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

      {cardToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--color-danger)' }}>Confirm Deletion</h2>
              <button className="modal-close" onClick={() => setCardToDelete(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <p>Are you sure you want to permanently delete card <strong>{cardToDelete.uid}</strong>?</p>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>This will erase its mapping history. This action cannot be undone.</p>
            </div>
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCardToDelete(null)}>Cancel</button>
              <button type="button" className="btn" style={{ background: 'var(--color-danger)', color: 'white', border: 'none' }} onClick={confirmDeleteCard}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
