import { useState } from 'react';
import { login } from '../api';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import BoxArt from '../components/BoxArt';

export default function Login({ onLogin, theme = 'dark', toggleTheme, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      await onLogin();
    } catch (err) {
      setError('Invalid credentials or server unreachable');
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
          <button className="kc-create-link" onClick={() => onNavigate('register')}>
            SIGN UP
          </button>
        </div>
      </header>

      <main className="kc-main">
        {/* Left branding panel */}
        <section className="kc-left">
          <div className="kc-brand">
            <BoxArt />
            <h1 className="kc-brand-name">KUBECART</h1>
            <p className="kc-tagline">Spin up your WooCommerce store in<br />one click.</p>
          </div>
        </section>

        {/* Right form panel */}
        <section className="kc-right">
          <div className="kc-form-wrap">
            <h2 className="kc-title">Login</h2>

            {error && <div className="kc-error">{error}</div>}

            <form onSubmit={handleSubmit} className="kc-form">
              <div className="kc-field">
                <label className="kc-label" htmlFor="kc-email">EMAIL</label>
                <input
                  id="kc-email"
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
                <label className="kc-label" htmlFor="kc-password">PASSWORD</label>
                <div className="kc-pw-wrap">
                  <input
                    id="kc-password"
                    type={showPassword ? 'text' : 'password'}
                    className="kc-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

              <div className="kc-row">
                <label className="kc-remember">
                  <input type="checkbox" className="kc-checkbox" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="kc-forgot">Forgot?</a>
              </div>

              <button type="submit" className="kc-btn" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
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
