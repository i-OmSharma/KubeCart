const { coreV1, appsV1 } = require('./client');

async function createSecret(namespace, dbPassword) {
  const spec = {
    metadata: { name: 'mysql-secret', namespace },
    type: 'Opaque',
    stringData: {
      'mysql-root-password': 'rootpassword',
      'mysql-database': 'wordpress',
      'mysql-user': 'wordpress',
      'mysql-password': dbPassword,
    },
  };
  try {
    await coreV1.createNamespacedSecret(namespace, spec);
    console.log('✓ mysql-secret created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create mysql-secret: ${err.message}`);
  }
}

async function createService(namespace) {
  const spec = {
    metadata: { name: 'mysql', namespace, labels: { app: 'mysql' } },
    spec: {
      clusterIP: 'None', // headless
      selector: { app: 'mysql' },
      ports: [{ port: 3306, targetPort: 3306, protocol: 'TCP', name: 'mysql' }],
    },
  };
  try {
    await coreV1.createNamespacedService(namespace, spec);
    console.log('✓ mysql service created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create mysql service: ${err.message}`);
  }
}

async function createStatefulSet(namespace) {
  const spec = {
    metadata: { name: 'mysql', namespace },
    spec: {
      serviceName: 'mysql',
      replicas: 1,
      selector: { matchLabels: { app: 'mysql' } },
      template: {
        metadata: { labels: { app: 'mysql' } },
        spec: {
          containers: [{
            name: 'mysql',
            image: 'mysql:8.0',
            resources: {
              requests: { cpu: '100m', memory: '256Mi' },
              limits: { cpu: '500m', memory: '512Mi' },
            },
            ports: [{ containerPort: 3306, name: 'mysql' }],
            env: [
              { name: 'MYSQL_ROOT_PASSWORD', valueFrom: { secretKeyRef: { name: 'mysql-secret', key: 'mysql-root-password' } } },
              { name: 'MYSQL_DATABASE', valueFrom: { secretKeyRef: { name: 'mysql-secret', key: 'mysql-database' } } },
              { name: 'MYSQL_USER', valueFrom: { secretKeyRef: { name: 'mysql-secret', key: 'mysql-user' } } },
              { name: 'MYSQL_PASSWORD', valueFrom: { secretKeyRef: { name: 'mysql-secret', key: 'mysql-password' } } },
            ],
            volumeMounts: [{ name: 'mysql-storage', mountPath: '/var/lib/mysql' }],
            readinessProbe: {
              exec: { command: ['mysqladmin', 'ping', '-h', '127.0.0.1', '-u', 'wordpress', '-pwp_pass_placeholder'] },
              initialDelaySeconds: 10,
              periodSeconds: 5,
              failureThreshold: 24, // 2 min total
            },
          }],
        },
      },
      volumeClaimTemplates: [{
        metadata: { name: 'mysql-storage' },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: { requests: { storage: '1Gi' } },
        },
      }],
    },
  };
  try {
    await appsV1.createNamespacedStatefulSet(namespace, spec);
    console.log('✓ mysql statefulset created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create mysql statefulset: ${err.message}`);
  }
}

// Poll MySQL pod readiness — no sleep(30), proper check every 5s up to 2min
async function waitForReady(namespace, maxMs = 120000) {
  const interval = 5000;
  const end = Date.now() + maxMs;

  console.log('⏳ waiting for MySQL pod to be ready...');
  while (Date.now() < end) {
    try {
      const res = await coreV1.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, 'app=mysql');
      const pod = res.body.items[0];
      if (pod) {
        const ready = pod.status?.conditions?.find(
          c => c.type === 'Ready' && c.status === 'True'
        );
        if (ready) {
          console.log('✓ MySQL ready');
          return true;
        }
      }
    } catch {
      // namespace may not be fully ready yet
    }
    await new Promise(r => setTimeout(r, interval));
  }
  return false;
}

module.exports = { createSecret, createService, createStatefulSet, waitForReady };
