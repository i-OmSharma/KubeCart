import { useState } from 'react';
import { X, RefreshCw, Copy, Check, Plus, Sparkles } from 'lucide-react';
import { createStore, generateProducts } from '../api';

const DEFAULT_PRODUCTS = [
  { name: 'Classic T-Shirt',  price: '499',  description: 'A classic cotton t-shirt' },
  { name: 'Denim Jeans',      price: '1299', description: 'Blue denim jeans' },
  { name: 'Sneakers',         price: '2499', description: 'Comfortable running shoes' },
];

function randomPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function LaunchModal({ theme, onClose, onCreated, onError }) {
  const [storeName,     setStoreName]     = useState('');
  const [adminPassword, setAdminPassword] = useState(() => randomPassword());
  const [storageSize,   setStorageSize]   = useState(2);
  const [products,      setProducts]      = useState(DEFAULT_PRODUCTS);
  const [copied,        setCopied]        = useState(false);
  const [creating,      setCreating]      = useState(false);

  const [aiMode,             setAiMode]             = useState(false);
  const [aiPrompt,           setAiPrompt]           = useState('');
  const [generatingProducts, setGeneratingProducts] = useState(false);
  const [aiError,            setAiError]            = useState(null);

  const regenerate = () => setAdminPassword(randomPassword());

  const copy = () => {
    navigator.clipboard.writeText(adminPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProductChange = (i, field, value) => {
    setProducts(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n; });
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingProducts(true);
    setAiError(null);
    try {
      const generated = await generateProducts(aiPrompt);
      setProducts(generated.map(p => ({ name: p.name, price: String(p.price), description: p.description })));
      setAiMode(false);
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI generation failed.');
    } finally {
      setGeneratingProducts(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    const payload = {
      store_name: storeName.trim() || 'My WooCommerce Store',
      admin_password: adminPassword,
      storage_size_gi: storageSize,
    };
    if (aiMode && aiPrompt.trim()) {
      payload.aiPrompt = aiPrompt;
    } else {
      payload.sample_products = products
        .filter(p => p.name && p.price)
        .map(p => `${p.name}|${p.price}|${p.description}`)
        .join('\n');
    }
    try {
      await createStore(payload);
      onCreated();
      onClose();
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to create store. Quota exceeded?');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="sm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sm-modal" data-theme={theme}>

        <div className="sm-modal-head">
          <h2 className="sm-modal-title">Launch New Store</h2>
          <button className="sm-icon-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="sm-modal-body">
          <form id="sm-store-form" onSubmit={handleSubmit} className="sm-form">

            <div className="sm-field">
              <label className="sm-label">STORE NAME</label>
              <input type="text" className="sm-input" placeholder="e.g. My Fashion Store"
                value={storeName} onChange={e => setStoreName(e.target.value)} />
              <span className="sm-hint">Displayed name for your WooCommerce store</span>
            </div>

            <div className="sm-field">
              <label className="sm-label">ADMIN PASSWORD</label>
              <div className="sm-pw-row">
                <input type="text" className="sm-input" value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)} />
                <button type="button" className="sm-icon-btn sm" onClick={regenerate} title="Regenerate">
                  <RefreshCw size={13} />
                </button>
                <button type="button" className="sm-icon-btn sm" onClick={copy} title="Copy">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              <span className="sm-hint">Password for the wp-admin 'admin' user</span>
            </div>

            <div className="sm-field">
              <label className="sm-label">WORDPRESS STORAGE (GI)</label>
              <input type="number" className="sm-input" min="1" max="20" value={storageSize}
                onChange={e => setStorageSize(parseInt(e.target.value))} required />
              <span className="sm-hint">MySQL needs +1 Gi. Total: {storageSize + 1} Gi</span>
            </div>

            <div className="sm-field">
              <div className="sm-products-header">
                <label className="sm-label">INITIAL PRODUCTS</label>
                <button type="button" className={`sm-ai-toggle${aiMode ? ' active' : ''}`}
                  onClick={() => { setAiMode(v => !v); setAiError(null); }}>
                  <Sparkles size={11} /> {aiMode ? 'Manual' : 'AI Generate'}
                  {!aiMode && <span className="sm-ai-toggle-badge">Llama 3.3</span>}
                </button>
              </div>

              {aiMode ? (
                <div className="sm-ai-section">
                  <input type="text" className="sm-input"
                    placeholder="e.g. I want to sell handmade candles"
                    value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                  <button type="button" className="sm-btn-primary sm"
                    onClick={handleAIGenerate}
                    disabled={generatingProducts || !aiPrompt.trim()}>
                    {generatingProducts
                      ? <><RefreshCw size={12} className="spin" /> Generating…</>
                      : <><Sparkles size={12} /> Generate 5 Products</>}
                  </button>
                  {aiError && <p className="sm-ai-error">{aiError}</p>}
                  <span className="sm-hint">AI generates 5 products. Edit before launching.</span>
                </div>
              ) : (
                <>
                  <div className="sm-products">
                    {products.map((p, i) => (
                      <div key={i} className="sm-product-item">
                        <div className="sm-product-top">
                          <input type="text" className="sm-input" placeholder="Product name"
                            value={p.name} onChange={e => handleProductChange(i, 'name', e.target.value)} required />
                          <input type="number" className="sm-input" placeholder="₹"
                            value={p.price} onChange={e => handleProductChange(i, 'price', e.target.value)} required />
                          <button type="button" className="sm-icon-btn sm"
                            onClick={() => setProducts(products.filter((_, j) => j !== i))}>
                            <X size={12} />
                          </button>
                        </div>
                        <input type="text" className="sm-input" placeholder="Description (optional)"
                          value={p.description} onChange={e => handleProductChange(i, 'description', e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <button type="button" className="sm-btn-ghost sm" style={{ marginTop: 8 }}
                    onClick={() => setProducts([...products, { name: '', price: '', description: '' }])}>
                    <Plus size={11} /> Add Product
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        <div className="sm-modal-foot">
          <button type="button" className="sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="sm-store-form" className="sm-btn-primary" disabled={creating}>
            {creating ? <><RefreshCw size={13} className="spin" /> Launching…</> : 'Launch Store'}
          </button>
        </div>

      </div>
    </div>
  );
}
