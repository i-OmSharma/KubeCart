# Monitoring — Prometheus + Grafana

Simple two-piece observability stack added to the KubeCart cluster.

## Why these two, and nothing else

- **Prometheus** — scrapes metrics (CPU, memory, pod status, restarts) from every
  node and pod in the cluster on a timer, stores them as a time series.
- **Grafana** — reads from Prometheus, draws dashboards/graphs.

That's the whole story: one thing *collects and stores*, one thing *displays*.
No Alertmanager, no OpenTelemetry, no Istio — kept out on purpose so there are
only two concepts to explain, not six.

## How it was installed

1. Added the Prometheus community Helm chart repo:
   ```
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo update
   ```

2. Wrote `k8s/monitoring/values.yaml` — a config file that tells the chart:
   - disable Alertmanager (`alertmanager.enabled: false`) — one less moving part
   - keep resource requests small (100m CPU / 256Mi mem for Prometheus,
     50m/128Mi for Grafana) — this runs on a laptop KIND cluster, not real
     prod hardware
   - retain only 1 day of metrics (`retention: 1d`) — a demo doesn't need weeks
     of history
   - Grafana admin password set to `admin` (local demo only, never do this in
     real prod)

3. Installed the chart into its own `monitoring` namespace (kept separate from
   app namespaces — standard practice, monitoring shouldn't live inside a
   tenant's store namespace):
   ```
   kubectl create namespace monitoring
   helm install kube-prom prometheus-community/kube-prometheus-stack \
     -n monitoring -f k8s/monitoring/values.yaml
   ```

   This one chart actually deploys several pods:
   - `prometheus-operator` — manages Prometheus config declaratively (K8s-native pattern)
   - `prometheus` — the actual metrics database
   - `grafana` — the dashboard UI
   - `kube-state-metrics` — translates K8s object state (pod count, deployment
     status) into Prometheus metrics
   - `node-exporter` — one per node, exposes host-level CPU/mem/disk metrics

4. Verified everything came up:
   ```
   kubectl -n monitoring get pods
   ```
   All pods should show `Running` and full readiness (e.g. `2/2`, `3/3`).

## How to view it

KIND only exposes ports 80/443 to your machine (see `k8s/kind-cluster.yaml`),
so Grafana's NodePort isn't reachable directly. Simplest way in for a local
demo — port-forward:

```
kubectl -n monitoring port-forward svc/kube-prom-grafana 3000:80
```

Then open `http://localhost:3000` — login `admin` / `admin`.

Prometheus is already wired as Grafana's default data source (the chart does
this automatically). Import dashboard ID **315** ("Kubernetes cluster
monitoring") or **747** ("Kubernetes Pods") from Grafana's dashboard gallery
for an instant, well-known view — both are community-standard dashboards, so
an interviewer will likely recognize them.

## Interview talking points

- **What is Prometheus?** Pull-based metrics system — it scrapes `/metrics`
  HTTP endpoints on a schedule (default 30s) rather than apps pushing to it.
- **What is a metric/label?** A metric is a named time series (e.g.
  `container_cpu_usage_seconds_total`); labels (e.g. `namespace="store-abc123"`)
  let you filter/group it — this is how you'd build a per-tenant-store view in
  KubeCart's multi-tenant model.
- **Why Grafana separate from Prometheus?** Separation of concerns — storage
  engine vs. visualization layer. Either could be swapped independently.
- **Why the Operator pattern?** Instead of hand-editing Prometheus's scrape
  config, the operator watches `ServiceMonitor`/`PodMonitor` CRDs and
  regenerates config automatically — declarative, K8s-native.
