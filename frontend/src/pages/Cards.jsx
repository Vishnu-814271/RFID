import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, X, Ban, AlertTriangle, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export function Cards() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [newCardUid, setNewCardUid] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCards = async () => {
    try {
      const data = await api.get('/cards');
      setCards(data || []);
    } catch (err) {
      console.error('Failed to fetch cards', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.passwordChangeRequired) {
      fetchCards();
    }
  }, [user?.passwordChangeRequired]);

  const handleRegisterCard = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/cards', { cardUid: newCardUid });
      setShowModal(false);
      setNewCardUid('');
      fetchCards(); // refresh
    } catch (err) {
      setError(err?.message || 'Failed to register card');
    }
  };

  const updateCardStatus = async (id, newStatus) => {
    if (!isManagerOrAdmin) return alert("Only Managers and Admins can update card status.");
    if (!window.confirm(`Are you sure you want to mark this card as ${newStatus}?`)) return;
    
    try {
      await api.patch(`/cards/${id}`, { status: newStatus });
      fetchCards();
    } catch (err) {
      alert(err?.message || 'Failed to update card status');
    }
  };

  const requestDeleteCard = (id, uid) => {
    if (user?.role !== 'ADMIN') return alert("Only Admins can delete cards.");
    setCardToDelete({ id, uid });
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;
    try {
      await api.delete(`/cards/${cardToDelete.id}`);
      setCardToDelete(null);
      fetchCards();
    } catch (err) {
      alert(err?.message || 'Failed to delete card');
    }
  };

  const filteredCards = cards.filter(c => 
    c.cardUid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cardId?.toString().includes(searchTerm)
  );

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
        <div className="table-toolbar">
          <div className="search-bar table-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search cards by UID..." 
              className="search-input" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                          <span style={{fontSize: '0.9rem'}}>{c.assignedPersonName}</span>
                          <span className="text-muted" style={{fontSize: '0.75rem'}}>ID: {c.assignedPersonId}</span>
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
                                onClick={() => updateCardStatus(c.cardId, 'LOST')}
                              >
                                <AlertTriangle size={16} />
                              </button>
                              <button 
                                className="icon-btn-small text-danger" 
                                title="Deactivate"
                                onClick={() => updateCardStatus(c.cardId, 'DEACTIVATED')}
                              >
                                <Ban size={16} />
                              </button>
                            </>
                          )}
                          {(c.status === 'DEACTIVATED' || c.status === 'LOST') && user?.role === 'ADMIN' && (
                            <button 
                              className="btn btn-success" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              title="Reactivate Card"
                              onClick={() => updateCardStatus(c.cardId, 'AVAILABLE')}
                            >
                              Reactivate
                            </button>
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
                  placeholder="Scan or enter 7-char alphanumeric UID..."
                  pattern="^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]{7}$"
                  title="Card UID must be exactly 7 characters and contain both numbers and alphabets"
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
