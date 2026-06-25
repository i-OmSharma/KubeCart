import { useState, useEffect } from 'react';
import { getCurrentUser, logout } from './api';
import { DEV_BYPASS_AUTH, MOCK_USER } from './dev';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import './App.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_BYPASS_AUTH);
  const [userProfile, setUserProfile] = useState(DEV_BYPASS_AUTH ? MOCK_USER : null);
  const [view, setView] = useState('login'); // 'login' | 'register'
  const [theme, setTheme] = useState(() => localStorage.getItem('kc-theme') || 'light');

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('kc-theme', next);
      return next;
    });
  };

  const loadUserProfile = async () => {
    try {
      const profile = await getCurrentUser();
      setUserProfile(profile);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setUserProfile(null);
      localStorage.removeItem('token');
    }
  };

  const handleLogin = async () => {
    await loadUserProfile();
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setUserProfile(null);
  };

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    const token = localStorage.getItem('token');
    if (token) loadUserProfile();

    const onUnauthorized = () => {
      setIsAuthenticated(false);
      setUserProfile(null);
    };
    window.addEventListener('kc:unauthorized', onUnauthorized);
    return () => window.removeEventListener('kc:unauthorized', onUnauthorized);
  }, []);

  if (!isAuthenticated) {
    if (view === 'register') {
      return (
        <Register
          theme={theme}
          toggleTheme={toggleTheme}
          onNavigate={setView}
          onRegistered={() => setView('login')}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        theme={theme}
        toggleTheme={toggleTheme}
        onNavigate={setView}
      />
    );
  }

  return (
    <Dashboard
      theme={theme}
      toggleTheme={toggleTheme}
      userProfile={userProfile}
      onLogout={handleLogout}
      onProfileRefresh={loadUserProfile}
    />
  );
}
