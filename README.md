# KubeCart

Multi-tenant WooCommerce store provisioning platform on Kubernetes. Users
sign up, hit "create store," and get an isolated, fully provisioned
WordPress + WooCommerce site running in its own Kubernetes namespace — no
manual setup, no shared infrastructure between tenants. AI features generate
starter products from a one-line prompt and diagnose failed deployments in
plain English.

Tested end-to-end on a local KIND cluster: signup → provision → live
storefront, verified working (2026-07-13).

## Why this exists

Spinning up a WooCommerce store normally means manually configuring a
database, WordPress, a theme, plugins, and hosting — repeated per customer.
KubeCart automates that whole path as a Kubernetes-native factory: one API
call creates a fully isolated tenant (namespace, database, WordPress
deployment, ingress route) with no manual intervention.

## Architecture

```
                    ┌─────────────┐
   React (Vite) ───▶│   Express    │───▶ Postgres (Neon) — users, store metadata
                    │   Backend    │
                    │  (port 3000) │───▶ Groq API — AI product gen / failure diagnosis
                    └──────┬───────┘
                           │ @kubernetes/client-node
                           ▼
                  ┌────────────────────┐
                  │   Kubernetes API    │
                  └────────┬───────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                   ▼
  namespace            namespace           namespace
  store-a1b2c3d4        store-9f8e7d6c      store-...
  ├─ mysql (StatefulSet + headless svc + Secret)
  ├─ wordpress (Deployment + PVC + ConfigMap + Service)
  └─ ingress (store-<id>.<domain> → wordpress svc)
```

**One Kubernetes namespace per store.** Full tenant isolation — no shared
database, no shared WordPress instance. Each namespace contains:

- A MySQL `StatefulSet` (headless service, credentials in a `Secret`)
- A WordPress `Deployment` with a `PersistentVolumeClaim`, configured via an
  init container running `wp-cli` (installs WordPress core, the Storefront
  theme, and the WooCommerce plugin, seeds sample products)
- An `Ingress` routing `store-<id>.<domain>` to the WordPress service

Resource requests/limits are set on every container (100m/256Mi requests,
500m/512Mi limits) so one noisy tenant can't starve the cluster.

## Stack

| Layer | Choice |
|---|---|
| Backend | Node.js + Express (CommonJS) |
| K8s orchestration | `@kubernetes/client-node` — talks directly to the K8s API, no shell-out to `kubectl` |
| Database | Postgres (Neon, serverless) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| AI | Groq API — product generation, failure diagnosis |
| Frontend | React + Vite |
| Local cluster | KIND (Kubernetes in Docker) |
| Monitoring | Prometheus + Grafana (`kube-prometheus-stack` Helm chart) |
| Production target | DigitalOcean (Kubernetes) — see [Production Setup](#production-setup-digitalocean) |

## Deliverables

```
KubeCart/
├── backend/
│   ├── src/
│   │   ├── k8s/          # namespace, mysql, wordpress resource builders (client-node)
│   │   ├── routes/       # auth, stores, ai
│   │   ├── models/       # user, store (Postgres queries)
│   │   ├── ai/           # productGenerator, failureDiagnoser (Groq)
│   │   └── services/     # storeManager (orchestrates provisioning), cleanup
│   ├── Dockerfile
│   └── Dockerfile.wp-prebaked   # bakes WooCommerce/Storefront zips into WP init image
├── frontend/             # React + Vite dashboard
├── k8s/                  # KIND cluster config, RBAC, monitoring values
├── wordpress-chart/      # Helm chart for deploying KubeCart itself (backend+frontend)
└── docs/
    ├── monitoring.md     # Prometheus/Grafana setup + interview talking points
    └── my_learnings.md   # real bugs hit + fixed, with root cause and fix
```

## Features

**Core factory**
- Signup/login (JWT-based auth)
- `POST /api/stores` — provisions a full tenant: namespace, MySQL, WordPress,
  ingress, with per-user store/storage limits enforced
- Store status polling — reflects live K8s state (`provisioning` → `ready` /
  `failed`)
- `DELETE /api/stores/:id` — tears down the whole namespace (cascades every
  resource in it)
- Background cleanup job — reaps stuck/orphaned provisioning attempts

**AI-assisted**
- `POST /api/ai/generate-products` — turns a one-line prompt (e.g. "handmade
  leather wallets") into 5 realistic product listings with names, prices, and
  descriptions, ready to seed into a new store
- `GET /api/stores/:id/diagnose` — reads pod status + K8s warning events for a
  failed store's namespace and returns a plain-English explanation and fix,
  instead of raw `kubectl describe` output

**Monitoring**
- Prometheus scrapes cluster/pod/namespace metrics
- Grafana dashboards visualize them (see `docs/monitoring.md`)

## Reliability details worth knowing

- **MySQL readiness**: polled every 5s up to a 2-minute timeout — no blind
  `sleep(30)` before assuming the database is up.
- **Rollback on failure**: any K8s provisioning error deletes the whole
  namespace, cleaning up every resource created so far. No half-provisioned
  tenants left behind.
- **Prebaked WordPress image**: bakes the WooCommerce + Storefront
  plugin/theme zips into a custom init-container image so store setup
  installs from local files instead of hitting the WordPress.org network on
  every single store creation.

## Local Setup (KIND)

### Prerequisites

```bash
brew install kind kubectl helm   # or your distro's package manager
```

### 1. Create the cluster

```bash
kind create cluster --name kubecart --config k8s/kind-cluster.yaml
```

### 2. Install ingress-nginx

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

KIND only host-maps ports 80/443 to the **control-plane** node
(`extraPortMappings` in `k8s/kind-cluster.yaml`). The controller pod can get
scheduled onto a worker node instead, which leaves it healthy but
unreachable from the host. If that happens:

```bash
kubectl -n ingress-nginx patch deployment ingress-nginx-controller --type=json -p='[
  {"op":"add","path":"/spec/template/spec/nodeSelector","value":{"kubernetes.io/hostname":"kubecart-control-plane"}},
  {"op":"add","path":"/spec/template/spec/tolerations","value":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}]}
]'
```

Full writeup in `docs/my_learnings.md`.

### 3. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, GROQ_API_KEY
npm install
npm start
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. (Optional) Prebaked WordPress image

Speeds up store provisioning by skipping per-store network installs:

```bash
docker build -f backend/Dockerfile.wp-prebaked -t kubecart/wp-prebaked:latest backend/
kind load docker-image kubecart/wp-prebaked:latest --name kubecart
```

Re-run after every image rebuild or cluster recreate — KIND nodes have their
own isolated containerd image cache, separate from the host's Docker.

### 6. (Optional) Monitoring

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prom prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f k8s/monitoring/values.yaml
```
See `docs/monitoring.md` for full details.

## Usage

### Creating a store

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'

# Create a store (manual products)
curl -X POST http://localhost:3000/api/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeName": "My Store",
    "adminPassword": "adminpass123",
    "storageGi": 2,
    "products": "T-Shirt|599|Cotton t-shirt\nJeans|1299|Denim jeans"
  }'

# ...or let AI generate products from a prompt
curl -X POST http://localhost:3000/api/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storeName":"My Store","adminPassword":"adminpass123","aiPrompt":"handmade leather wallets"}'

# List stores
curl http://localhost:3000/api/stores -H "Authorization: Bearer $TOKEN"

# Diagnose a failed store
curl http://localhost:3000/api/stores/{id}/diagnose -H "Authorization: Bearer $TOKEN"

# Delete a store
curl -X DELETE http://localhost:3000/api/stores/{id} -H "Authorization: Bearer $TOKEN"
```

Provisioning takes roughly 30-90 seconds (MySQL readiness + WordPress
core/theme/plugin install). Visit the store at
`http://store-<id>.localhost` once status is `ready`.

## Production Setup (DigitalOcean)

Deployment target is **DigitalOcean Kubernetes (DOKS)** — a managed control
plane means no etcd/apiserver babysitting, which keeps the ops story simple
to explain in an interview while still being a real, standard production K8s
setup.

> Full deployment steps (DOKS cluster creation, container registry, DNS,
> cert-manager/Let's Encrypt, Helm values for prod) are being finalized —
> see the deployment discussion for the current plan. The existing
> `wordpress-chart/values-prod.yaml` predates the Node.js rewrite (still
> references the old Flask/SQLite setup) and needs updating before it's
> used for a real deploy.

Planned shape:
- **DOKS** cluster (managed control plane, node pool sized for demo load)
- **DigitalOcean Container Registry** for backend/frontend images
- **cert-manager + Let's Encrypt** for TLS on the ingress
- **Wildcard DNS** (`*.yourdomain.com`) pointed at the DOKS load balancer,
  so every store gets `store-<id>.yourdomain.com` automatically
- Secrets (JWT secret, `DATABASE_URL`, `GROQ_API_KEY`) via Kubernetes
  `Secret` objects, not baked into images or values files

## System design notes

**Namespace-per-store isolation** — each store gets its own namespace for
resource isolation, simpler quota enforcement, and clean cascading deletion.
Tradeoff: more objects for the API server to track as store count grows;
fine at the scale this project targets.

**Postgres (Neon) over a local file DB** — control-plane metadata (users,
store records) needs to survive backend pod restarts/redeploys without a
persistent volume tied to a single node, which a serverless Postgres gives
for free. Tradeoff: a network hop + Neon's cold-start latency on the first
query after idle (mitigated with a startup warm-up query — see
`backend/src/models/db.js`).

**Imperative K8s API calls over rendering full manifests via Helm per-store**
— store creation has real procedural logic (check quota → create namespace →
wait for MySQL → run WP-CLI init → poll for ready), which maps naturally to
`@kubernetes/client-node` calls in `storeManager.js` rather than a giant
templated values file per tenant.

**StatefulSet for MySQL** — stable network identity per store's database.
Not about scaling (each store has exactly one DB pod); it's about the pod
keeping the same DNS name across restarts so WordPress's DB host config
doesn't break.

## Troubleshooting

**Store stuck in `provisioning`:**
```bash
kubectl get pods -n store-{id}
kubectl logs -n store-{id} {wordpress-pod} -c wp-init
```

**Ingress not routing / connection fails from host:**
```bash
kubectl get ingress -A
kubectl -n ingress-nginx get pods -o wide   # check which node it's on
```
See `docs/my_learnings.md` if it's Running but still unreachable.

**WordPress init container stuck on `Init:ErrImageNeverPull`:**
Rebuild and reload the prebaked image (see step 5 above) — this happens
after any cluster recreate since the image cache is wiped.

**Backend can't create namespaces:**
```bash
kubectl auth can-i create namespaces --as=system:serviceaccount:default:kubecart-backend
```

## License

MIT
