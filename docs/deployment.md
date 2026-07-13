# Deploying KubeCart to DigitalOcean (cost-optimized)

**Status: live.** Backend running on DOKS with real HTTPS, frontend on
Vercel pointed at it, full signup → store → live WooCommerce flow verified
end-to-end in production. This doc is both the runbook and a record of what
actually happened deploying it (including every bug hit along the way —
good interview material).

## Live setup

- Backend: `https://api.<node-IP>.sslip.io` — DOKS, region `nyc1`, single
  `s-1vcpu-2gb` node, Let's Encrypt TLS via cert-manager (bootstrapped once,
  then uninstalled — see below)
- Frontend: Vercel, `VITE_API_URL` pointed at the HTTPS backend
- Database: Neon Postgres (free tier)
- Registry: DO Container Registry, starter tier (free)

## Cost — ~$12/mo total

| Item | Choice | Cost |
|---|---|---|
| DOKS control plane | managed, basic (no HA add-on) | $0 |
| Worker node | **1× `s-1vcpu-2gb`** | ~$12/mo |
| Ingress | hostNetwork on that single node — no DO Load Balancer | $0 |
| TLS | Let's Encrypt via cert-manager, **bootstrapped then removed** | $0 |
| Container registry | DO Container Registry, starter tier (1 repo, 500MB) | $0 |
| Database | Neon Postgres, free tier | $0 |
| DNS | `sslip.io` | $0 |
| Monitoring | Prometheus/Grafana stays local-only (KIND), not deployed to prod | $0 |
| **Total** | | **~$12/mo** |

$200 GitHub Student Pack credit covers this for **16+ months** continuously.

Why the cheapest node size actually works here: cert-manager only needs to
*run* while issuing/renewing a certificate — the issued cert is a plain
Kubernetes `Secret`, independent of the controller once created. Installing
cert-manager, letting it issue the cert, then deleting it frees the CPU it
was using (~300-400m) permanently while the HTTPS cert keeps working. The
tradeoff: cert-manager needs to be reinstalled to renew before the
certificate expires (Let's Encrypt certs last 90 days — check
`kubectl get secret kubecart-backend-tls -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -enddate`
periodically).

**Known constraint:** with cert-manager removed, idle CPU usage sits around
77% (kube-system + ingress + backend). One demo store pushes it to ~99% —
it schedules and works, but with near-zero headroom. Fine for one store at
a time (interview demo use case); would need `s-2vcpu-4gb` ($24/mo) for
comfortable multi-store headroom.

---

## Step 1 — Create the DOKS cluster

```bash
doctl kubernetes cluster create kubecart \
  --region nyc1 \
  --node-pool "name=pool1;size=s-1vcpu-2gb;count=1" \
  --ha=false \
  --wait
```

**`--ha=false` is not optional to omit** — newer `doctl`/DO API defaults to
HA control plane enabled, which adds ~$40/mo. First attempt at this
deployment didn't pass it explicitly and silently became a $64/mo cluster.
Always pass it.

**Region matters more than you'd expect**: `blr1` and `sgp1` both failed to
provision cleanly (stuck in `provisioning` for 30-90+ min, or never even
created a worker droplet) during this deployment — not a config issue,
DO-side flakiness on those regions at the time. `nyc1` worked on the first
try. If a region hangs past ~15-20 min with `doctl kubernetes cluster list`
showing no change, don't keep waiting indefinitely — delete
(`doctl kubernetes cluster delete kubecart --force`) and try a different
region. Also check `doctl compute droplet list` after any delete — the
underlying droplet sometimes isn't auto-reaped and needs
`doctl compute droplet delete <id> --force` manually, or it keeps billing.

---

## Step 2 — Install ingress-nginx (hostNetwork, no Load Balancer)

The "baremetal" provider manifest defaults to a `NodePort` service, **not**
`hostNetwork` — despite the name. Two steps needed:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/baremetal/deploy.yaml

kubectl -n ingress-nginx patch deployment ingress-nginx-controller --type=json -p='[
  {"op":"add","path":"/spec/template/spec/hostNetwork","value":true},
  {"op":"add","path":"/spec/template/spec/dnsPolicy","value":"ClusterFirstWithHostNet"}
]'
```

DOKS auto-creates cloud firewalls that only open the NodePort range by
default — plain port 80/443 traffic from the internet gets dropped even
with `hostNetwork` set, until you open it explicitly:

```bash
doctl compute firewall create \
  --name kubecart-http-https \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:443,address:0.0.0.0/0,address:::/0" \
  --outbound-rules "protocol:tcp,ports:0,address:0.0.0.0/0,address:::/0 protocol:udp,ports:0,address:0.0.0.0/0,address:::/0 protocol:icmp,address:0.0.0.0/0,address:::/0" \
  --tag-names "k8s:<your-cluster-id>"
```

Get the node's public IP — this is your `STORE_URL_SUFFIX` base:
```bash
kubectl get nodes -o wide   # EXTERNAL-IP column
```

Verify: `curl http://<node-IP>/` should return nginx's default 404 (means
routing works, no ingress rules matched yet — expected at this point).

---

## Step 3 — Container registry + push backend image

```bash
doctl registry create kubecart
doctl registry login

docker build -t registry.digitalocean.com/kubecart/backend:latest backend/
docker push registry.digitalocean.com/kubecart/backend:latest

doctl kubernetes cluster registry add kubecart
```

`backend/Dockerfile` and `.dockerignore` had never been updated from the
original Python/Flask version — rewritten for Node before this worked
(`FROM node:20-slim`, `npm ci`, port 3000, `.env` excluded from the image).

---

## Step 4 — Apply RBAC

```bash
kubectl apply -f k8s/rbac.yaml
```

---

## Step 5 — Create secrets

```bash
kubectl create secret generic kubecart-backend-secret \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=DATABASE_URL="<your Neon connection string>" \
  --from-literal=GROQ_API_KEY="<your Groq key>"
```

---

## Step 6 — Deploy the backend

```bash
kubectl apply -f k8s/backend-deploy.yaml
```

`k8s/backend-deploy.yaml` needs `<node-IP>` substituted in three places
(`STORE_URL_SUFFIX` env var, and both `host` fields in the Ingress) before
applying — currently hardcoded from this deployment's actual IP.

Gotchas hit getting this pod healthy:

- **`ErrImagePull` (401 Unauthorized)**: `doctl kubernetes cluster registry add`
  only patches the `default` ServiceAccount's `imagePullSecrets` — the
  backend runs under `serviceAccountName: store-factory` (for the RBAC
  permissions), which doesn't get it automatically. Fixed by adding
  `imagePullSecrets: [{name: kubecart}]` directly to the pod spec.
- **`Init:ErrImageNeverPull` on every store's WordPress pod**: `wordpress.js`
  referenced a local-only prebaked image (`kubecart/wp-prebaked:latest`,
  `imagePullPolicy: Never`) that only exists after a manual
  `kind load docker-image` on a local KIND cluster — never pushed anywhere.
  Fixed with an env-var toggle (`WP_INIT_IMAGE`, defaults to the public
  `wordpress:cli-php8.1`) and a fallback in the setup script to install
  WooCommerce/Storefront from the network when the prebaked zips aren't
  present at `/wp-cache/`.
- **`Error: '/var/www/html/' is not writable`**: the stock `wordpress:cli-php8.1`
  image's default user can't write to DO's block-storage-backed PVC (unlike
  the custom prebaked image, which explicitly ran as root). Fixed with
  `securityContext: { runAsUser: 0 }` on the init container.
- **504 Gateway Timeout on `POST /api/stores`**: store creation blocks
  synchronously on MySQL readiness (up to 2 min) before responding — fine
  locally without a proxy in front, but nginx's default 60s
  `proxy-read-timeout` cuts it off in front of a real ingress. Fixed with
  `nginx.ingress.kubernetes.io/proxy-read-timeout/proxy-send-timeout: "180"`
  annotations.

---

## Step 7 — HTTPS via cert-manager (bootstrap, then remove)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml

kubectl apply -f - <<'EOF'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: <your-email>
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
EOF
```

`sslip.io` works fine here — it's real DNS, so Let's Encrypt's HTTP-01
challenge validates against it same as any domain. No purchased domain
needed.

Add to the backend Ingress annotations (already in `k8s/backend-deploy.yaml`):
```yaml
cert-manager.io/cluster-issuer: letsencrypt-prod
nginx.ingress.kubernetes.io/ssl-redirect: "false"   # see below
```
plus a `tls:` block with the host and a `secretName`.

Two more gotchas:

- **ACME challenge gets a 503, stuck `pending`**: ingress-nginx
  auto-redirects HTTP→HTTPS once any `tls:` block exists on an ingress for
  that host — but the HTTP-01 challenge needs plain HTTP to work (no cert
  exists yet, chicken-and-egg). Fix: `ssl-redirect: "false"` annotation on
  the ingress during/after issuance.
- **Solver pod stuck `Pending` ("Insufficient cpu")**: on the `s-1vcpu-2gb`
  node, cert-manager's temporary `cm-acme-http-solver-*` pod couldn't
  schedule because a leftover demo store was still consuming the last of
  the CPU headroom. Fixed by deleting the unneeded store first
  (`kubectl delete namespace store-<id>` or, better, the API's
  `DELETE /api/stores/:id` so the DB record doesn't go stale too — see next
  gotcha).

Once `kubectl get certificate` shows `READY: True`, **remove cert-manager**
to free its CPU permanently — the issued cert is just a Secret now:
```bash
kubectl delete namespace cert-manager
```
This deletes only the controller; the CRDs, the `Certificate` object, and
the `kubecart-backend-tls` Secret (in the `default` namespace) are
untouched and the cert keeps working. Reinstall cert-manager the same way
to renew before it expires.

---

## Step 8 — Point Vercel frontend at the HTTPS backend

```bash
cd frontend
vercel env rm VITE_API_URL production --yes
echo "https://api.<node-IP>.sslip.io/api" | vercel env add VITE_API_URL production
vercel --prod --yes
```

`cors()` in `backend/src/server.js` has no origin restriction (`app.use(cors())`),
so no backend changes needed for the cross-origin Vercel → DO calls.

---

## Step 9 — End-to-end verification

```bash
curl -X POST https://api.<node-IP>.sslip.io/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'

# create a store with the returned token, wait ~2-3 min, then:
curl http://store-<id>.<node-IP>.sslip.io/
```

**Always delete test stores via the API (`DELETE /api/stores/:id`), not
`kubectl delete namespace` directly** — the namespace deletion alone
doesn't touch the Postgres `stores` row, so the per-user store limit
(default 3) fills up with "phantom" stores that don't exist in the cluster
anymore, blocking new creates with `"Store limit reached"`.

---

## Keeping it cheap long-term

- Don't enable cluster autoscaling or the HA control plane add-on ($40/mo).
- `--ha=false` on every cluster create — it is not the default.
- Delete unused store namespaces via the API (see above) after testing.
- Reinstall cert-manager only when renewing the cert, not permanently.
- Check `doctl invoice summary` occasionally to sanity-check actual spend.
- `doctl compute droplet list` after any `cluster delete` — confirm no
  orphaned droplet is left billing.
