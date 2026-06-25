const express = require('express');
const authMiddleware = require('../middleware/auth');
const storeManager = require('../services/storeManager');
const userModel = require('../models/user');
const storeModel = require('../models/store');
const k8sNamespace = require('../k8s/namespace');
const { generateProducts } = require('../ai/productGenerator');
const { diagnoseFailure } = require('../ai/failureDiagnoser');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const stores = storeModel.findByUser(req.user.userId);
    // For provisioning stores, check actual K8s status
    const enriched = stores.map(s => {
      if (s.status === 'provisioning') {
        k8sNamespace.getStatus(s.namespace).then(k8sStatus => {
          if (k8sStatus === 'ready' || k8sStatus === 'failed') {
            storeModel.updateStatus(s.id, k8sStatus);
          }
        }).catch(() => {});
      }
      return {
        id: s.id,
        namespace: s.namespace,
        status: s.status,
        store_name: s.store_name,
        url: s.url,
        admin_url: s.url ? `${s.url}/wp-admin` : null,
        admin_user: 'admin',
        admin_password: s.admin_password,
        storage_gi: s.storage_gi,
        created_at: s.created_at,
        owner: req.user.email,
      };
    });
    res.json({ stores: enriched });
  } catch (err) {
    console.error('list stores error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const store = storeModel.findById(req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    let { status } = store;
    if (status === 'provisioning') {
      const k8sStatus = await k8sNamespace.getStatus(store.namespace);
      if (k8sStatus === 'ready' || k8sStatus === 'failed') {
        storeModel.updateStatus(store.id, k8sStatus);
        status = k8sStatus;
      }
    }

    res.json({
      id: store.id,
      namespace: store.namespace,
      status,
      store_name: store.store_name,
      url: store.url,
      admin_url: store.url ? `${store.url}/wp-admin` : null,
      admin_user: 'admin',
      admin_password: store.admin_password,
      storage_gi: store.storage_gi,
      created_at: store.created_at,
    });
  } catch (err) {
    console.error('get store error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const storeName = req.body.storeName || req.body.store_name || 'My WooCommerce Store';
    const adminPassword = req.body.adminPassword || req.body.admin_password;
    const storageGi = parseInt(req.body.storageGi || req.body.storage_size_gi || 2, 10);
    const aiPrompt = req.body.aiPrompt;

    if (!adminPassword) return res.status(400).json({ error: 'adminPassword required' });

    let products = req.body.products || req.body.sample_products;

    if (aiPrompt && !products) {
      try {
        const aiProducts = await generateProducts(aiPrompt);
        products = aiProducts.map(p => `${p.name}|${p.price}|${p.description}`).join('\n');
      } catch (aiErr) {
        console.error('AI product generation failed, using fallback:', aiErr.message);
        products = 'Sample Product|299|A great product';
      }
    }

    if (!products) products = 'Sample Product|299|A great product';

    const result = await storeManager.createStore({
      userId, storeName, adminPassword, storageGi, products,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('create store error:', err);
    const status = err.message.includes('limit') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

router.get('/:id/diagnose', async (req, res) => {
  try {
    const store = storeModel.findById(req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const diagnosis = await diagnoseFailure(store.namespace);
    res.json({ diagnosis });
  } catch (err) {
    console.error('diagnose error:', err);
    res.status(500).json({ error: 'Diagnosis failed: ' + err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const store = storeModel.findById(req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    await storeManager.deleteStore(store);
    res.json({ success: true });
  } catch (err) {
    console.error('delete store error:', err);
    res.status(500).json({ error: err.message });
  }
});

// /api/users/me — kept in stores router for simplicity
router.get('/user/me', (req, res) => {
  try {
    const user = userModel.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const usage = userModel.getUsage(req.user.userId);
    res.json({
      username: user.email,
      email: user.email,
      max_stores: user.max_stores,
      max_storage: user.max_storage_gi,
      current_stores: usage.store_count,
      current_storage: usage.total_storage_gi,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
