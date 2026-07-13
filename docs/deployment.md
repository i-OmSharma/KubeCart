# Deploying KubeCart to DigitalOcean (cost-optimized)

Target: DOKS (managed Kubernetes) for the backend + WordPress factory.
Frontend stays on Vercel (already deployed). No domain, no cert-manager —
using `sslip.io` for free wildcard DNS (`<anything>.<IP>.sslip.io` resolves
to `<IP>` automatically, zero signup).

Run each step yourself in order. After each one, tell me and I'll verify it
with `doctl`/`kubectl` before you move to the next.

## Cost plan — target ~$24/mo total

| Item | Choice | Cost |
|---|---|---|
| DOKS control plane | managed, basic (no HA add-on) | $0 |
| Worker nodes | **1× `s-2vcpu-4gb`** | ~$24/mo |
| Ingress | hostNetwork on that single node — **no DO Load Balancer** | $0 |
| Container registry | DO Container Registry, starter tier (1 repo, 500MB) | $0 |
| Database | Neon Postgres, free tier (already in use) | $0 |
| DNS | `sslip.io` | $0 |
| Monitoring | Prometheus/Grafana stays **local-only** (KIND), not deployed to prod | $0 |
| **Total** | | **~$24/mo** |

Your $200 GitHub Student Pack credit covers this for **8+ months**
continuously — no need to tear the cluster down between demos.

Why each cut:

- **1 node, not 2**: a single `s-2vcpu-4gb` (2 vCPU, 4GB RAM) comfortably
  fits kube-system pods + ingress-nginx + the backend + 1-2 demo stores.
  Going smaller (`s-1vcpu-2gb`) risks pods stuck `Pending` — not worth the
  ~$12/mo saved for demo reliability. Going to 2 nodes doubles cost for
  headroom this project doesn't need.
- **No managed Load Balancer**: DO's LB is a flat ~$12/mo regardless of
  traffic, and its entire job is spreading traffic across *multiple* nodes.
  With exactly one node, that's nothing to load-balance across — deploying
  ingress-nginx with `hostNetwork: true` instead binds nginx straight to the
  node's public IP on ports 80/443, skipping the LB entirely. Same
  functional result, one less paid resource. (This is also a legitimate
  interview answer, not just a cost hack — "why no LB" → "single node,
  redundant.")
- **No monitoring on prod**: Prometheus + Grafana (kube-state-metrics,
  node-exporter, the operator) together want real CPU/memory — running that
  continuously on the same small node as the actual demo app risks starving
  it. Monitoring is already fully tested and demoable on the local KIND
  cluster (`docs/monitoring.md`) — that's the resume claim; it doesn't need
  to also run in the always-on cloud copy.

---

## Step 1 — Create the DOKS cluster

```bash
doctl kubernetes cluster create kubecart \
  --region blr1 \
  --node-pool "name=pool1;size=s-2vcpu-4gb;count=1" \
  --wait
```

- `--region blr1` = Bangalore (pick whatever's closest — run
  `doctl kubernetes options regions` to see all).
- Single node, no autoscaling, no HA control plane — keeps billing flat and
  predictable.
- Takes ~5 minutes, auto-configures your local `kubectl` context when done.

**Tell me when done** — I'll run `doctl kubernetes cluster list` and
`kubectl get nodes` to confirm it's healthy, and grab the node's public IP.

---

## Step 2 — Install ingress-nginx (hostNetwork, no Load Balancer)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/baremetal/deploy.yaml
```

The "baremetal" provider manifest runs the controller with `hostNetwork:
true` and `hostPort` 80/443 instead of a `LoadBalancer` service — it binds
directly to whichever node it lands on. Since the cluster has exactly one
node, that's deterministic.

Get the node's public IP:
```bash
kubectl get nodes -o wide
```
Use the `EXTERNAL-IP` column. This IP is your `STORE_URL_SUFFIX` base:
`STORE_URL_SUFFIX=<that-IP>.sslip.io`.

**Tell me the IP when you have it** — I'll verify the controller pod is
Running and `curl` reaches it.

---

## Step 3 — Container registry + push backend image

```bash
doctl registry create kubecart

# Log docker into your new registry
doctl registry login

# Build and push
docker build -t registry.digitalocean.com/kubecart/backend:latest backend/
docker push registry.digitalocean.com/kubecart/backend:latest

# Let the cluster pull from your registry without manual imagePullSecrets
doctl kubernetes cluster registry add kubecart
```

**Tell me when pushed** — I'll run `doctl registry repository list-tags kubecart/backend` to confirm.

---

## Step 4 — Apply RBAC

Already correct for this — no changes needed:
```bash
kubectl apply -f k8s/rbac.yaml
```

**Tell me when applied** — I'll check the ClusterRole/ClusterRoleBinding exist.

---

## Step 5 — Create secrets

```bash
kubectl create secret generic kubecart-backend-secret \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=DATABASE_URL="<your Neon connection string from backend/.env>" \
  --from-literal=GROQ_API_KEY="<your Groq key from backend/.env>"
```

Pull the actual values from your local `backend/.env` — don't retype them
by hand into chat, just copy from the file.

**Tell me when created** — I'll confirm the secret exists (won't ask to see
the values).

---

## Step 6 — Deploy the backend

I'll write the Deployment/Service/Ingress manifest once the node's public
IP from Step 2 is known (needed for `STORE_URL_SUFFIX`). Backend pod
resource requests will be kept modest (~100m CPU / 128Mi memory) to leave
room for store workloads on the single node. Get me that IP and I'll
generate `k8s/backend-deploy.yaml` for you to `kubectl apply -f`.

---

## Step 7 — Point Vercel frontend at the new backend

Once the backend Ingress is up, get its hostname
(`api.<node-IP>.sslip.io`), then in your Vercel project settings update the
`VITE_API_URL` env var to point at it, and redeploy the frontend.

---

## Step 8 — End-to-end test

Same flow we validated locally: signup → create store → wait for `ready` →
curl the store URL. I'll drive this with you once everything's live.

---

## Keeping it cheap long-term

- Don't enable cluster autoscaling or the HA control plane add-on ($40/mo) —
  neither is needed for a portfolio demo.
- Don't add a second node pool unless you're actually running multiple
  concurrent demo stores.
- Delete unused store namespaces after testing
  (`kubectl delete namespace store-<id>`) — PVCs cost storage even when the
  pods aren't running.
- Check `doctl invoice summary` occasionally to sanity-check actual spend
  against this plan.
