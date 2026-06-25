import { useState } from 'react';
import { deleteStore } from '../api';
import { useStores } from '../hooks/useStores';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import HomeView from '../components/HomeView';
import StoreDetailView from '../components/StoreDetailView';
import LaunchModal from '../components/LaunchModal';
import AllActivities from './AllActivities';
import SettingsPage from './SettingsPage';
import SupportPage from './SupportPage';
import AccountPage from './AccountPage';
import { X } from 'lucide-react';

// view: 'home' | 'detail' | 'activities' | 'settings' | 'support' | 'account'

export default function Dashboard({ theme, toggleTheme, userProfile, onLogout, onProfileRefresh }) {
  const { stores, setStores, error, setError, fetchStores } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [view, setView]         = useState('home');
  const [modalOpen, setModalOpen] = useState(false);

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  const goHome   = () => { setSelectedStoreId(null); setView('home'); };
  const goDetail = (id) => { setSelectedStoreId(id); setView('detail'); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this store? This cannot be undone.')) return;
    try {
      await deleteStore(id);
      setStores(s => s.filter(x => x.id !== id));
      if (selectedStoreId === id) goHome();
      onProfileRefresh?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete store.');
    }
  };

  const handleCreated = async () => {
    await fetchStores();
    onProfileRefresh?.();
  };

  return (
    <div className="sm-root" data-theme={theme}>

      <Sidebar
        stores={stores}
        selectedStoreId={selectedStoreId}
        onSelectStore={goDetail}
        onLaunch={() => setModalOpen(true)}
        onHome={goHome}
        onSettings={() => setView('settings')}
        onSupport={() => setView('support')}
        userProfile={userProfile}
        onLogout={onLogout}
        onAccount={() => setView('account')}
      />

      <main className="sm-main">
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          userProfile={userProfile}
          onLaunch={() => setModalOpen(true)}
          stores={stores}
          onAccount={() => setView('account')}
        />

        {error && (
          <div className="sm-error-bar">
            {error}
            <button className="sm-icon-btn sm" onClick={() => setError(null)}><X size={12} /></button>
          </div>
        )}

        {view === 'home' && (
          <HomeView
            stores={stores}
            userProfile={userProfile}
            onLaunch={() => setModalOpen(true)}
            onSelectStore={goDetail}
            onViewAll={() => setView('activities')}
          />
        )}

        {view === 'detail' && selectedStore && (
          <StoreDetailView
            store={selectedStore}
            onDelete={handleDelete}
            onClose={goHome}
          />
        )}

        {view === 'activities' && (
          <AllActivities
            stores={stores}
            onSelectStore={goDetail}
            onBack={goHome}
            onStoreDeleted={(id) => {
              setStores(s => s.filter(x => x.id !== id));
              onProfileRefresh?.();
            }}
            onError={setError}
          />
        )}

        {view === 'settings' && (
          <SettingsPage theme={theme} toggleTheme={toggleTheme} onBack={goHome} />
        )}

        {view === 'support' && (
          <SupportPage onBack={goHome} />
        )}

        {view === 'account' && (
          <AccountPage userProfile={userProfile} stores={stores} onBack={goHome} />
        )}
      </main>

      {modalOpen && (
        <LaunchModal
          theme={theme}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
          onError={setError}
        />
      )}

    </div>
  );
}
