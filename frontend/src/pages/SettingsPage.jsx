import { ArrowLeft, Moon, Sun, Bell, Shield, Trash2 } from 'lucide-react';

export default function SettingsPage({ theme, toggleTheme, onBack }) {
  return (
    <section className="sm-content">
      <div className="sm-settings">

        <div className="sm-act-header">
          <button className="sm-btn-ghost sm" onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 className="sm-act-title">Settings</h2>
          <p className="sm-act-sub">Manage your account preferences</p>
        </div>

        <div className="sm-settings-sections">

          {/* Appearance */}
          <div className="sm-settings-card">
            <h3 className="sm-settings-section-title">Appearance</h3>
            <div className="sm-settings-row">
              <div className="sm-settings-row-info">
                <span className="sm-settings-row-label">Theme</span>
                <span className="sm-settings-row-sub">Switch between light and dark mode</span>
              </div>
              <button className="sm-settings-toggle" onClick={toggleTheme}>
                {theme === 'dark'
                  ? <><Sun size={14} /> Light Mode</>
                  : <><Moon size={14} /> Dark Mode</>}
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="sm-settings-card">
            <h3 className="sm-settings-section-title">Notifications</h3>
            <div className="sm-settings-row">
              <div className="sm-settings-row-info">
                <span className="sm-settings-row-label">Store status alerts</span>
                <span className="sm-settings-row-sub">Get notified when store status changes</span>
              </div>
              <label className="sm-toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="sm-toggle-track"><span className="sm-toggle-thumb" /></span>
              </label>
            </div>
            <div className="sm-settings-row">
              <div className="sm-settings-row-info">
                <span className="sm-settings-row-label">Storage warnings</span>
                <span className="sm-settings-row-sub">Alert when storage exceeds 80%</span>
              </div>
              <label className="sm-toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="sm-toggle-track"><span className="sm-toggle-thumb" /></span>
              </label>
            </div>
          </div>

          {/* Security */}
          <div className="sm-settings-card">
            <h3 className="sm-settings-section-title">Security</h3>
            <div className="sm-settings-row">
              <div className="sm-settings-row-info">
                <span className="sm-settings-row-label"><Shield size={13} /> Two-factor authentication</span>
                <span className="sm-settings-row-sub">Add an extra layer of security</span>
              </div>
              <button className="sm-btn-ghost sm">Enable</button>
            </div>
            <div className="sm-settings-row">
              <div className="sm-settings-row-info">
                <span className="sm-settings-row-label">Change password</span>
                <span className="sm-settings-row-sub">Update your account password</span>
              </div>
              <button className="sm-btn-ghost sm">Update</button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="sm-settings-card sm-settings-danger">
            <h3 className="sm-settings-section-title danger">Danger Zone</h3>
            <div className="sm-settings-row">
              <div className="sm-settings-row-info">
                <span className="sm-settings-row-label">Delete account</span>
                <span className="sm-settings-row-sub">Permanently remove your account and all stores</span>
              </div>
              <button className="sm-btn-danger"><Trash2 size={13} /> Delete Account</button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
