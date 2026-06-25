import { useState } from 'react';
import { Trash2, X, ExternalLink, Lock, Eye, EyeOff, Search, RefreshCw } from 'lucide-react';
import { diagnoseStore } from '../api';

const STATUS_COLOR = {
  running:      '#22c55e',
  provisioning: '#f59e0b',
  initialized:  '#94a3b8',
  failed:       '#ef4444',
  deleted:      '#64748b',
};

export default function StoreDetailView({ store, onDelete, onClose }) {
  const [showPass, setShowPass]   = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis]   = useState(null);
  const [diagError, setDiagError]   = useState(null);

  const handleDiagnose = async () => {
    setDiagnosing(true);
    setDiagnosis(null);
    setDiagError(null);
    try {
      const text = await diagnoseStore(store.id);
      setDiagnosis(text);
    } catch (err) {
      setDiagError(err.response?.data?.error || 'Diagnosis failed.');
    } finally {
      setDiagnosing(false);
    }
  };

  const rows = [
    { key: 'Store URL',   val: store.url
        ? <a href={store.url} target="_blank" rel="noreferrer" className="sm-link"><ExternalLink size={12} /> {store.url}</a>
        : '—' },
    { key: 'Admin Panel', val: (store.admin_url || store.url)
        ? <a href={store.admin_url || `${store.url}/wp-admin`} target="_blank" rel="noreferrer" className="sm-link"><Lock size={12} /> wp-admin</a>
        : '—' },
    store.namespace  && { key: 'Namespace', val: <code className="sm-code">{store.namespace}</code> },
    store.storage_gi && { key: 'Storage',   val: `${store.storage_gi} Gi` },
    store.created_at && { key: 'Created',   val: new Date(store.created_at).toLocaleString() },
    { key: 'Username',    val: <code className="sm-code">{store.admin_user || 'admin'}</code> },
    { key: 'Password',    val: (
        <div className="sm-cred-pass">
          <code className="sm-code">{showPass ? (store.admin_password || '—') : '••••••••••••'}</code>
          <button className="sm-icon-btn sm" onClick={() => setShowPass(v => !v)}>
            {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      ) },
  ].filter(Boolean);

  return (
    <section className="sm-content">
      <div className="sm-detail">
        <div className="sm-detail-head">
          <div>
            <h1 className="sm-detail-title">{store.store_name || store.id}</h1>
            <span className="sm-detail-status" style={{ color: STATUS_COLOR[store.status] }}>
              ● {store.status}
            </span>
          </div>
          <div className="sm-detail-actions">
            {store.status === 'failed' && (
              <button className="sm-btn-ghost sm" onClick={handleDiagnose} disabled={diagnosing}>
                {diagnosing
                  ? <><RefreshCw size={12} className="spin" /> Diagnosing…</>
                  : <><Search size={12} /> Diagnose</>}
              </button>
            )}
            <button className="sm-btn-danger" onClick={() => onDelete(store.id)}>
              <Trash2 size={13} /> Delete
            </button>
            <button className="sm-icon-btn" onClick={onClose} title="Back"><X size={15} /></button>
          </div>
        </div>

        <div className="sm-detail-grid">
          {rows.map((row, i) => (
            <div key={i} className="sm-detail-row">
              <span className="sm-detail-key">{row.key}</span>
              <span className="sm-detail-val">{row.val}</span>
            </div>
          ))}
        </div>

        {diagnosis && (
          <div className="sm-diagnosis">
            <p className="sm-diagnosis-label">AI DIAGNOSIS</p>
            <p className="sm-diagnosis-text">{diagnosis}</p>
          </div>
        )}
        {diagError && <p className="sm-ai-error">{diagError}</p>}
      </div>
    </section>
  );
}
