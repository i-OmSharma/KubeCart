import { useState } from 'react';
import { register } from './api';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import BoxArt from './BoxArt';

export default function Register({ theme = 'dark', toggleTheme, onNavigate, onRegistered }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(username, email, password);
      setSuccess(true);
      setTimeout(() => onRegistered?.(), 1500);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Registration failed';
      setError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kc-root" data-theme={theme}>
      <header className="kc-header">
        <span className="kc-wordmark">KubeCart<span className="kc-dot">●</span></span>
        <div className="kc-header-right">
          <button className="kc-theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="kc-create-link" onClick={() => onNavigate('login')}>
            SIGN IN
          </button>
        </div>
      </header>

      <main className="kc-main">
        {/* Left branding panel */}
        <section className="kc-left">
          <div className="kc-brand">
            <BoxArt />
            <h1 className="kc-brand-name">KUBECART</h1>
            <p className="kc-tagline">Deploy production-ready WooCommerce<br />stores on Kubernetes instantly.</p>
          </div>
        </section>

        {/* Right form panel */}
        <section className="kc-right">
          <div className="kc-form-wrap">
            <h2 className="kc-title">Create<br />Account</h2>

            {error && <div className="kc-error">{error}</div>}
            {success && <div className="kc-success">Account created! Redirecting…</div>}

            <form onSubmit={handleSubmit} className="kc-form">
              <div className="kc-field">
                <label className="kc-label" htmlFor="reg-username">USERNAME</label>
                <input
                  id="reg-username"
                  type="text"
                  className="kc-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="kc-field">
                <label className="kc-label" htmlFor="reg-email">EMAIL ADDRESS</label>
                <input
                  id="reg-email"
                  type="email"
                  className="kc-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="kc-field">
                <label className="kc-label" htmlFor="reg-password">PASSWORD</label>
                <div className="kc-pw-wrap">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="kc-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="kc-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="kc-field">
                <label className="kc-label" htmlFor="reg-confirm">CONFIRM PASSWORD</label>
                <div className="kc-pw-wrap">
                  <input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className="kc-input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="kc-eye"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="kc-btn" disabled={loading || success}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <footer className="kc-footer">
              © 2025 KUBECART. ALL RIGHTS RESERVED.
              <span className="kc-footer-links">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
              </span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
