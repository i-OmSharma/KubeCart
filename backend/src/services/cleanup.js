const pool = require('../models/db');
const nsOps = require('../k8s/namespace');

async function runCleanup() {
  const { rows } = await pool.query("SELECT id, namespace FROM stores WHERE status = 'deleted'");
  for (const store of rows) {
    const exists = await nsOps.exists(store.namespace);
    if (exists) {
      console.log(`cleanup: removing orphan namespace ${store.namespace}`);
      try { await nsOps.del(store.namespace); } catch (e) {
        console.error(`cleanup failed for ${store.namespace}: ${e.message}`);
      }
    }
  }
}

function startCleanupJob() {
  setInterval(runCleanup, 5 * 60 * 1000);
  console.log('cleanup job started (5min interval)');
}

module.exports = { startCleanupJob };
