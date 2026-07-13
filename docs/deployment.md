# Deploying KubeCart to DigitalOcean

Target: DOKS (managed Kubernetes) for the backend + WordPress factory.
Frontend stays on Vercel (already deployed). No domain, no cert-manager —
using `sslip.io` for free wildcard DNS (`<anything>.<IP>.sslip.io` resolves
to `<IP>` automatically, zero signup).

Run each step yourself in order. After each one, tell me and I'll verify it
with `doctl`/`kubectl` before you move to the next.

---

## Step 1 — Create the DOKS cluster

```bash
doctl kubernetes cluster create kubecart \
  --region blr1 \
  --node-pool "name=pool1;size=s-2vcpu-4gb;count=2" \
  --wait
```

- `--region blr1` = Bangalore (pick whatever's closest to you — run
  `doctl kubernetes options regions` to see all).
- `s-2vcpu-4gb` = cheapest node size that comfortably runs MySQL+WordPress
  pods per store. 2 nodes total.
- This takes ~5 minutes and auto-configures your local `kubectl` context
  when done.
- **Cost note:** control plane is free on DOKS; you're billed for the 2
  nodes (~$48/mo combined at this size) — covered by your credit, but keep
  an eye on it and `doctl kubernetes cluster delete kubecart` when you're
  done demoing if you want to stop the meter.

**Tell me when done** — I'll run `doctl kubernetes cluster list` and
`kubectl get nodes` to confirm it's healthy.

---

## Step 2 — Install ingress-nginx (DO variant)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/do/deploy.yaml
```

This provisions a real DigitalOcean Load Balancer automatically (unlike
KIND — no manual port-mapping or node-pinning needed here, DO handles it).

Wait for the external IP:
```bash
kubectl -n ingress-nginx get svc ingress-nginx-controller -w
```
Ctrl+C once `EXTERNAL-IP` shows a real IP instead of `<pending>` (can take
1-2 minutes).

**Tell me the IP when you have it** — I'll verify the controller pod is
Running and the LB is reachable.

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

I'll write the Deployment/Service/Ingress manifest once the ingress LB IP
from Step 2 is known (needed to set `STORE_URL_SUFFIX=<IP>.sslip.io` as an
env var). Get me that IP and I'll generate `k8s/backend-deploy.yaml` for you
to `kubectl apply -f`.

---

## Step 7 — Point Vercel frontend at the new backend

Once the backend Ingress is up, get its hostname
(`api.<LB-IP>.sslip.io`), then in your Vercel project settings update the
`VITE_API_URL` env var to point at it, and redeploy the frontend.

---

## Step 8 — End-to-end test

Same flow we validated locally: signup → create store → wait for `ready` →
curl the store URL. I'll drive this with you once everything's live.
