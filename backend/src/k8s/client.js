const k8s = require('@kubernetes/client-node');
const fs = require('fs');

const kc = new k8s.KubeConfig();

const inCluster =
  process.env.K8S_IN_CLUSTER === 'true' ||
  fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token');

let coreV1 = null;
let appsV1 = null;
let networkingV1 = null;

try {
  if (inCluster) {
    kc.loadFromCluster();
    console.log('K8s: in-cluster config');
  } else {
    kc.loadFromDefault();
    console.log('K8s: local kubeconfig');
  }
  coreV1 = kc.makeApiClient(k8s.CoreV1Api);
  appsV1 = kc.makeApiClient(k8s.AppsV1Api);
  networkingV1 = kc.makeApiClient(k8s.NetworkingV1Api);
  console.log('K8s: client initialized');
} catch (err) {
  console.warn('K8s: no cluster available — K8s operations will fail gracefully:', err.message);
}

module.exports = { coreV1, appsV1, networkingV1 };
