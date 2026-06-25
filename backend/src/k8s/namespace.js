const { coreV1 } = require('./client');

async function create(name) {
  try {
    await coreV1.createNamespace({
      metadata: {
        name,
        labels: { app: 'store', 'managed-by': 'store-platform' },
      },
    });
    console.log(`✓ namespace created: ${name}`);
  } catch (err) {
    if (err.response?.statusCode === 409) return; // already exists
    throw new Error(`Failed to create namespace ${name}: ${err.message}`);
  }
}

async function del(name) {
  try {
    await coreV1.deleteNamespace(name);
    console.log(`✓ namespace deleted: ${name}`);
  } catch (err) {
    if (err.response?.statusCode === 404) return; // already gone
    throw new Error(`Failed to delete namespace ${name}: ${err.message}`);
  }
}

async function exists(name) {
  try {
    await coreV1.readNamespace(name);
    return true;
  } catch {
    return false;
  }
}

// Poll K8s pods to derive store status
async function getStatus(namespace) {
  try {
    const res = await coreV1.listNamespacedPod(namespace);
    const pods = res.body.items;
    if (pods.length === 0) return 'provisioning';

    let wordpressReady = false;
    let hasFailed = false;

    for (const pod of pods) {
      if (pod.status?.phase === 'Failed') { hasFailed = true; continue; }

      const isWordpress = pod.metadata.name.startsWith('wordpress-');
      if (!isWordpress) continue;

      const initDone = !pod.status?.initContainerStatuses ||
        pod.status.initContainerStatuses.every(
          ic => ic.state?.terminated?.exitCode === 0
        );

      const mainReady = pod.status?.containerStatuses?.every(c => c.ready) ?? false;

      if (pod.status?.phase === 'Running' && initDone && mainReady) {
        wordpressReady = true;
      }
    }

    if (hasFailed) return 'failed';
    if (wordpressReady) return 'ready';
    return 'provisioning';
  } catch {
    return 'unknown';
  }
}

module.exports = { create, del, exists, getStatus };
