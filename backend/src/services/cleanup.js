const db = require('../models/db');
const nsOps = require('../k8s/namespace');

// Periodic job: delete K8s namespaces for stores marked 'deleted' but namespace still exists
async function runCleanup() {
  const stale = db.prepare("SELECT id, namespace FROM stores WHERE status = 'deleted'").all();
  for (const store of stale) {
    const exists = await nsOps.exists(store.namespace);
    if (exists) {
      console.log(`cleanup: removing orphan namespace ${store.namespace}`);
      try { await nsOps.del(store.namespace); } catch (e) {
        console.error(`cleanup failed for ${store.namespace}: ${e.message}`);
      }
    }
  }
}

// Run cleanup every 5 minutes
function startCleanupJob() {
  setInterval(runCleanup, 5 * 60 * 1000);
  console.log('cleanup job started (5min interval)');
}

module.exports = { startCleanupJob };
