import { Plus, Sun, Moon, Bell, User, Store, Database } from 'lucide-react';

export default function Topbar({ theme, toggleTheme, userProfile, onLaunch, onAccount, stores }) {
  const usedStorage   = userProfile?.current_storage ?? 0;
  const maxStorage    = userProfile?.max_storage ?? 20;
  const currentStores = userProfile?.current_stores ?? stores.length;
  const maxStores     = userProfile?.max_stores ?? 5;

  return (
    <header className="sm-topbar">
      <div className="sm-topbar-metrics">
        <span className="sm-metric">
          <Store size={13} />
          STORES <strong>{currentStores}/{maxStores}</strong>
        </span>
        <span className="sm-metric-div" />
        <span className="sm-metric">
          <Database size={13} />
          CAPACITY <strong>{usedStorage}/{maxStorage} GB</strong>
        </span>
      </div>

      <div className="sm-topbar-right">
        <button className="sm-create-btn" onClick={onLaunch}>
          <Plus size={14} /> Create New
        </button>
        <button className="sm-icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button className="sm-icon-btn"><Bell size={15} /></button>
        <button className="sm-icon-btn" onClick={onAccount} title="Account">
          <User size={15} />
        </button>
      </div>
    </header>
  );
}
