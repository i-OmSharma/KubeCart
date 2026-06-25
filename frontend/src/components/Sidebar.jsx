import { Store, Plus, Settings, HelpCircle, LogOut, User } from 'lucide-react';

const STATUS_COLOR = {
  running:      '#22c55e',
  provisioning: '#f59e0b',
  initialized:  '#94a3b8',
  failed:       '#ef4444',
  deleted:      '#64748b',
};

export default function Sidebar({
  stores, selectedStoreId,
  onSelectStore, onLaunch, onHome,
  onSettings, onSupport, onAccount,
  userProfile, onLogout,
}) {
  return (
    <aside className="sm-sidebar">
      <div className="sm-sb-brand sm-sb-brand-link" onClick={onHome}>
        <h1 className="sm-sb-title">Store Management</h1>
        <p className="sm-sb-sub">Admin Dashboard</p>
      </div>

      <nav className="sm-sb-nav">
        {stores.length === 0 && (
          <p className="sm-no-stores">No stores yet</p>
        )}
        {stores.map(store => (
          <button
            key={store.id}
            className={`sm-nav-item${selectedStoreId === store.id ? ' active' : ''}`}
            onClick={() => onSelectStore(store.id)}
          >
            <Store size={16} className="sm-nav-icon" />
            <span className="sm-nav-label">{store.store_name || store.id}</span>
            <span
              className="sm-nav-dot"
              style={{ background: STATUS_COLOR[store.status] || '#94a3b8' }}
            />
          </button>
        ))}

        <div className="sm-launch-cta" onClick={onLaunch}>
          <div className="sm-lc-circle"><Plus size={18} /></div>
          <span className="sm-lc-label">Launch Store</span>
        </div>
      </nav>

      <div className="sm-sb-footer">
        <button className="sm-footer-link" onClick={onSettings}>
          <Settings size={16} /> Settings
        </button>
        <button className="sm-footer-link" onClick={onSupport}>
          <HelpCircle size={16} /> Support
        </button>
        <div className="sm-user-row">
          <button className="sm-avatar" onClick={onAccount} title="Account">
            {userProfile?.username?.[0]?.toUpperCase() ?? 'U'}
          </button>
          <div className="sm-user-info" style={{ cursor: 'pointer' }} onClick={onAccount}>
            <span className="sm-user-name">{userProfile?.username ?? 'User'}</span>
            <span className="sm-user-role">OWNER</span>
          </div>
          <button className="sm-logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
