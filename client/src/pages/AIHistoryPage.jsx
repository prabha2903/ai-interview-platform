import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmModal from '../components/ConfirmModal';
import { getHistory, deleteHistoryItem, clearHistory } from '../services/historyService';
import { 
  History, 
  Trash2, 
  Search, 
  Sparkles, 
  Calendar, 
  Eye, 
  X,
  AlertOctagon
} from 'lucide-react';

const CATEGORIES = ['All', 'Interview Prep', 'Code Review', 'Technical Q&A', 'Career Advice', 'System Design'];

const AIHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory({
        category: selectedCategory,
        search: searchQuery,
      });
      setHistory(data.history || []);
    } catch (err) {
      console.error("History fetch error:", err);
      setError("Failed to load prompt history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteHistoryItem(itemToDelete._id);
      setHistory((prev) => prev.filter((item) => item._id !== itemToDelete._id));
      setItemToDelete(null);
    } catch (err) {
      console.error("Delete history error:", err);
      setError("Failed to delete history item.");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearHistory();
      setHistory([]);
      setShowClearModal(false);
    } catch (err) {
      console.error("Clear history error:", err);
      setError("Failed to clear history records.");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="main-content">
      <Sidebar />
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="badge badge-primary" style={{ marginBottom: '12px' }}>
              <History size={14} style={{ marginRight: '6px' }} />
              MongoDB Saved Sessions
            </div>
            <h1 className="page-title">AI Prompt History</h1>
            <p className="page-subtitle">
              Review and manage your saved technical prompts and AI responses.
            </p>
          </div>

          {history.length > 0 && (
            <button 
              onClick={() => setShowClearModal(true)} 
              className="btn btn-danger"
              style={{ marginTop: '8px' }}
            >
              <Trash2 size={16} /> Clear All History
            </button>
          )}
        </div>

        <ErrorMessage message={error} onClose={() => setError(null)} />

        {/* Search & Category Filter Toolbar */}
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Category Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`chip ${selectedCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px', paddingRight: '12px', height: '40px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ height: '40px', padding: '0 16px' }}>
                Search
              </button>
            </form>
          </div>
        </div>

        {/* History List View */}
        {loading ? (
          <LoadingSpinner message="Loading saved prompts..." />
        ) : history.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <AlertOctagon size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              No History Records Found
            </h3>
            <p style={{ fontSize: '0.925rem' }}>
              {searchQuery || selectedCategory !== 'All' 
                ? 'Try clearing search filters to see all history.' 
                : 'Start asking questions in the AI Assistant workspace to populate your history.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((item) => (
              <div key={item._id} className="glass-card history-item-card">
                <div className="history-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-primary">{item.category}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.825rem' }}
                    >
                      <Eye size={15} /> View Full
                    </button>
                    <button 
                      onClick={() => setItemToDelete(item)}
                      className="btn btn-danger" 
                      style={{ padding: '6px 10px' }}
                      title="Delete item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {item.prompt}
                </div>

                <div style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.5
                }}>
                  {item.response}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Details Modal */}
        {selectedItem && (
          <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
            <div className="modal-card" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Prompt Details</h3>
                  <span className="badge badge-primary">{selectedItem.category}</span>
                </div>
                <button onClick={() => setSelectedItem(null)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>User Prompt:</div>
                <div style={{ fontWeight: 600, fontSize: '1rem', background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  {selectedItem.prompt}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Gemini AI Response:</div>
                <div className="response-content" style={{ maxHeight: '350px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  {selectedItem.response}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Single Item Delete Confirmation */}
        <ConfirmModal
          isOpen={!!itemToDelete}
          title="Delete Prompt Record?"
          message="Are you sure you want to delete this interaction from your MongoDB history?"
          confirmText="Delete"
          isDanger
          onConfirm={handleDeleteItem}
          onCancel={() => setItemToDelete(null)}
        />

        {/* Clear All Confirmation */}
        <ConfirmModal
          isOpen={showClearModal}
          title="Clear All Saved History?"
          message="This action will permanently purge all AI prompt history saved under your user account."
          confirmText="Clear All Records"
          isDanger
          onConfirm={handleClearAll}
          onCancel={() => setShowClearModal(false)}
        />
      </div>
    </div>
  );
};

export default AIHistoryPage;
