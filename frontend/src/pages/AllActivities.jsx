import { ArrowLeft, Store, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { deleteStore } from '../api';

const STATUS_COLOR = {
  running:      '#22c55e',
  provisioning: '#f59e0b',
  initialized:  '#94a3b8',
  failed:       '#ef4444',
  deleted:      '#64748b',
};

const STATUS_BG = {
  running:      'rgba(34,197,94,0.1)',
  provisioning: 'rgba(245,158,11,0.1)',
  initialized:  'rgba(148,163,184,0.1)',
  failed:       'rgba(239,68,68,0.1)',
  deleted:      'rgba(100,116,139,0.1)',
};

export default function AllActivities({ stores, onSelectStore, onBack, onStoreDeleted, onError }) {

  const handleDelete = async (store) => {
    if (!window.confirm(`Delete "${store.store_name || store.id}"? This cannot be undone.`)) return;
    try {
      await deleteStore(store.id);
      onStoreDeleted(store.id);
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to delete store.');
    }
  };

  return (
    <section className="sm-content">
      <div className="sm-activities">

        <div className="sm-act-header">
          <button className="sm-btn-ghost sm" onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 className="sm-act-title">All Stores</h2>
          <p className="sm-act-sub">{stores.length} store{stores.length !== 1 ? 's' : ''} total</p>
        </div>

        {stores.length === 0 ? (
          <div className="sm-empty">
            <p>No stores found.</p>
          </div>
        ) : (
          <div className="sm-act-table">
            <div className="sm-act-thead">
              <span>Store</span>
              <span>Status</span>
              <span>Storage</span>
              <span>Created</span>
              <span>URL</span>
              <span></span>
            </div>
            {stores.map(store => (
              <div key={store.id} className="sm-act-row" onClick={() => onSelectStore(store.id)}>

                <div className="sm-act-store-cell">
                  <div className="sm-act-icon"><Store size={16} /></div>
                  <div>
                    <p className="sm-act-name">{store.store_name || store.id}</p>
                    <p className="sm-act-ns">{store.namespace}</p>
                  </div>
                </div>

                <div onClick={e => e.stopPropagation()}>
                  <span className="sm-act-badge" style={{
                    color: STATUS_COLOR[store.status],
                    background: STATUS_BG[store.status],
                  }}>
                    <span className="sm-dot" style={{ background: STATUS_COLOR[store.status] }} />
                    {store.status}
                  </span>
                </div>

                <span className="sm-act-cell">{store.storage_gi ? `${store.storage_gi} Gi` : '—'}</span>

                <span className="sm-act-cell sm-act-date">
                  {store.created_at ? new Date(store.created_at).toLocaleDateString() : '—'}
                </span>

                <span className="sm-act-cell" onClick={e => e.stopPropagation()}>
                  {store.url
                    ? <a href={store.url} target="_blank" rel="noreferrer" className="sm-link">
                        <ExternalLink size={12} /> Visit
                      </a>
                    : '—'}
                </span>

                <div className="sm-act-actions" onClick={e => e.stopPropagation()}>
                  <button className="sm-act-del" onClick={() => handleDelete(store)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
