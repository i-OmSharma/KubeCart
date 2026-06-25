import { Store } from 'lucide-react';

const STATUS_COLOR = {
  running:      '#22c55e',
  provisioning: '#f59e0b',
  initialized:  '#94a3b8',
  failed:       '#ef4444',
  deleted:      '#64748b',
};

export default function StoreCard({ store, onClick }) {
  return (
    <button className="sm-rc-card" onClick={onClick}>
      <div className="sm-rc-icon"><Store size={18} /></div>
      <div className="sm-rc-info">
        <h5 className="sm-rc-name">{store.store_name || store.id}</h5>
        <div className="sm-rc-status">
          <span className="sm-dot" style={{ background: STATUS_COLOR[store.status] || '#94a3b8' }} />
          <span>{store.status.toUpperCase()}</span>
        </div>
      </div>
    </button>
  );
}
