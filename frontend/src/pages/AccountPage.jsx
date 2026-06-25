import { ArrowLeft, User, Database, Store, Mail } from 'lucide-react';

export default function AccountPage({ userProfile, stores, onBack }) {
  const usedStorage   = userProfile?.current_storage ?? 0;
  const maxStorage    = userProfile?.max_storage ?? 20;
  const currentStores = userProfile?.current_stores ?? stores.length;
  const maxStores     = userProfile?.max_stores ?? 5;
  const storagePct    = maxStorage > 0 ? Math.round((usedStorage / maxStorage) * 100) : 0;
  const storesPct     = maxStores  > 0 ? Math.round((currentStores / maxStores)  * 100) : 0;

  return (
    <section className="sm-content">
      <div className="sm-settings">

        <div className="sm-act-header">
          <button className="sm-btn-ghost sm" onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 className="sm-act-title">Account</h2>
          <p className="sm-act-sub">Your profile and usage</p>
        </div>

        <div className="sm-settings-sections">

          {/* Profile */}
          <div className="sm-settings-card">
            <h3 className="sm-settings-section-title">Profile</h3>
            <div className="sm-account-profile">
              <div className="sm-account-avatar">
                {userProfile?.username?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="sm-account-info">
                <div className="sm-settings-row">
                  <div className="sm-settings-row-info">
                    <span className="sm-settings-row-label"><User size={13} /> Username</span>
                  </div>
                  <span className="sm-account-val">{userProfile?.username ?? '—'}</span>
                </div>
                <div className="sm-settings-row">
                  <div className="sm-settings-row-info">
                    <span className="sm-settings-row-label"><Mail size={13} /> Email</span>
                  </div>
                  <span className="sm-account-val">{userProfile?.email ?? '—'}</span>
                </div>
                <div className="sm-settings-row">
                  <div className="sm-settings-row-info">
                    <span className="sm-settings-row-label">Role</span>
                  </div>
                  <span className="sm-ov-badge" style={{ background: 'var(--sm-surface-low)', color: 'var(--sm-muted)' }}>OWNER</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage */}
          <div className="sm-settings-card">
            <h3 className="sm-settings-section-title">Usage</h3>

            <div className="sm-usage-row">
              <div className="sm-usage-head">
                <span className="sm-settings-row-label"><Store size={13} /> Stores</span>
                <span className="sm-usage-val">{currentStores} / {maxStores}</span>
              </div>
              <div className="sm-progress-track" style={{ marginTop: 8 }}>
                <div className="sm-progress-fill" style={{ width: `${Math.max(storesPct, 2)}%` }} />
              </div>
            </div>

            <div className="sm-usage-row" style={{ marginTop: 20 }}>
              <div className="sm-usage-head">
                <span className="sm-settings-row-label"><Database size={13} /> Storage</span>
                <span className="sm-usage-val">{usedStorage} GB / {maxStorage} GB — {storagePct}% used</span>
              </div>
              <div className="sm-progress-track" style={{ marginTop: 8 }}>
                <div
                  className={`sm-progress-fill${storagePct >= 70 ? ' warn' : ''}`}
                  style={{ width: `${Math.max(storagePct, 2)}%` }}
                />
              </div>
            </div>

            <p className="sm-hint" style={{ marginTop: 12 }}>
              Contact support to increase your quotas.
            </p>
          </div>

          {/* Active Stores Summary */}
          {stores.length > 0 && (
            <div className="sm-settings-card">
              <h3 className="sm-settings-section-title">Active Stores</h3>
              <div className="sm-account-stores">
                {stores.map(store => (
                  <div key={store.id} className="sm-account-store-row">
                    <span className="sm-act-name">{store.store_name || store.id}</span>
                    <span className="sm-act-cell">{store.storage_gi ? `${store.storage_gi} Gi` : '—'}</span>
                    <span className="sm-act-badge" style={{
                      color: STATUS_COLOR[store.status],
                      background: STATUS_BG[store.status],
                    }}>
                      <span className="sm-dot" style={{ background: STATUS_COLOR[store.status] }} />
                      {store.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

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
