import { Plus } from 'lucide-react';
import StoreCard from './StoreCard';
import StoreOverviewWidget from './StoreOverviewWidget';
import StorageWidget from './StorageWidget';

export default function HomeView({ stores, userProfile, onLaunch, onSelectStore, onViewAll }) {
  const usedStorage = userProfile?.current_storage ?? 0;
  const maxStorage  = userProfile?.max_storage ?? 20;
  const recent      = stores.slice(0, 3);

  return (
    <section className="sm-content">
      <div className="sm-bento">

        {/* CTA card — 8/12 */}
        <div className="sm-cta-card" onClick={onLaunch}>
          <div className="sm-cta-inner">
            <div className="sm-cta-circle"><Plus size={28} /></div>
            <h3 className="sm-cta-title">Ready to expand?</h3>
            <p className="sm-cta-sub">
              Launch a new store instance with a single click.
              Configure your theme and products in the next step.
            </p>
            <button className="sm-cta-btn" onClick={e => { e.stopPropagation(); onLaunch(); }}>
              Launch New Store
            </button>
          </div>
        </div>

        {/* Stats column — 4/12 */}
        <div className="sm-stats-col">
          <StoreOverviewWidget stores={stores} />
          <StorageWidget usedStorage={usedStorage} maxStorage={maxStorage} />
        </div>

        {/* Recent Stores — 12/12 */}
        <div className="sm-recent">
          <div className="sm-recent-head">
            <h3 className="sm-recent-title">Recent Stores</h3>
            {stores.length > 0 && (
              <button className="sm-view-all" onClick={onViewAll}>View All Activities</button>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="sm-empty">
              <p>No stores yet.</p>
              <button className="sm-btn-primary" onClick={onLaunch}>
                <Plus size={13} /> Launch first store
              </button>
            </div>
          ) : (
            <div className="sm-recent-cards">
              {recent.map(store => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onClick={() => onSelectStore(store.id)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
