const crypto = require('crypto');
const userModel = require('../models/user');
const storeModel = require('../models/store');
const nsOps = require('../k8s/namespace');
const mysqlOps = require('../k8s/mysql');
const wpOps = require('../k8s/wordpress');

function genStoreId() {
  return crypto.randomBytes(4).toString('hex');
}

async function createStore({ userId, storeName, adminPassword, storageGi, products }) {
  const user = await userModel.findById(userId);
  if (!user) throw new Error('User not found');

  const usage = await userModel.getUsage(userId);
  if (usage.store_count >= user.max_stores) {
    throw new Error(`Store limit reached (max ${user.max_stores})`);
  }
  const totalRequested = storageGi + 1;
  if (usage.total_storage_gi + totalRequested > user.max_storage_gi) {
    throw new Error(`Storage limit reached (${user.max_storage_gi - usage.total_storage_gi}Gi available)`);
  }

  const storeId = genStoreId();
  const namespace = `store-${storeId}`;
  const suffix = process.env.STORE_URL_SUFFIX || 'localhost';
  const storeUrl = `http://store-${storeId}.${suffix}`;

  await storeModel.create({ id: storeId, userId, namespace, storeName, adminPassword, products, storageGi, url: storeUrl });
  await storeModel.updateStatus(storeId, 'provisioning');
  console.log(`\n=== Creating store ${storeId} ===`);

  try {
    await nsOps.create(namespace);

    await mysqlOps.createSecret(namespace, adminPassword);
    await mysqlOps.createService(namespace);
    await mysqlOps.createStatefulSet(namespace);

    const mysqlReady = await mysqlOps.waitForReady(namespace);
    if (!mysqlReady) throw new Error('MySQL did not become ready within 2 minutes');

    await wpOps.createConfigMap(namespace, storeUrl, storeName, adminPassword, products);
    await wpOps.createSetupScriptConfigMap(namespace);
    await wpOps.createPVC(namespace, storageGi);
    await wpOps.createDeployment(namespace, storeUrl);
    await wpOps.createService(namespace);
    await wpOps.createIngress(namespace, storeUrl);

    console.log(`✅ Store ${storeId} provisioned\n`);
    return {
      id: storeId,
      namespace,
      status: 'provisioning',
      url: storeUrl,
      admin_url: `${storeUrl}/wp-admin`,
      admin_user: 'admin',
      admin_password: adminPassword,
    };
  } catch (err) {
    console.error(`❌ Store ${storeId} failed: ${err.message}. Rolling back...`);
    try { await nsOps.del(namespace); } catch {}
    await storeModel.updateStatus(storeId, 'failed');
    throw err;
  }
}

async function deleteStore(store) {
  await storeModel.updateStatus(store.id, 'deleted');
  await nsOps.del(store.namespace);
  await storeModel.remove(store.id);
  console.log(`✅ Store ${store.id} deleted`);
}

module.exports = { createStore, deleteStore };
