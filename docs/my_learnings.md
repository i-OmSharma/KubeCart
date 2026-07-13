# Learnings / debugging log

Real issues hit while building and testing KubeCart, kept here as interview
material — "tell me about a bug you fixed" answers, not hypotheticals.

## Ingress unreachable from host despite pod Running/Ready

**Symptom:** `curl http://store-xxx.localhost` returned nothing
(`HTTP 000`, connection failed) even though `kubectl get pods -n ingress-nginx`
showed the controller as `1/1 Running`.

**Root cause:** KIND only forwards host ports 80/443 into the
**control-plane** container (see `extraPortMappings` in
`k8s/kind-cluster.yaml`) — worker nodes get no such mapping. The
ingress-nginx controller Deployment has no node affinity by default, so the
Kubernetes scheduler placed it on a worker node. The pod worked fine
*inside* the cluster; it was simply unreachable from the host machine,
because host port 80 was wired to a different container than the one
running nginx.

**Fix:** pin the controller to the control-plane node explicitly:
```bash
kubectl -n ingress-nginx patch deployment ingress-nginx-controller --type=json -p='[
  {"op":"add","path":"/spec/template/spec/nodeSelector","value":{"kubernetes.io/hostname":"kubecart-control-plane"}},
  {"op":"add","path":"/spec/template/spec/tolerations","value":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}]}
]'
```
The toleration is required because control-plane nodes carry a `NoSchedule`
taint by default — without it, the nodeSelector alone would leave the pod
permanently `Pending`.

**Why this makes a good interview answer:** it's not a code bug, it's a
scheduling/networking mismatch between "pod is healthy" and "pod is
reachable" — a distinction a lot of people miss. Good way to demonstrate you
understand node taints, tolerations, and how KIND's port-mapping model
differs from a real cloud LoadBalancer.

## WordPress init container stuck on `Init:ErrImageNeverPull`

**Symptom:** after switching the WordPress init container to a custom
prebaked image (`kubecart/wp-prebaked:latest`, built locally to bake in
WooCommerce/Storefront zip files and skip network installs per store), new
store pods hung indefinitely in `Init:ErrImageNeverPull`.

**Root cause:** the image was built with `docker build` on the host but
never loaded into the KIND cluster's nodes. KIND nodes run their own
containerd, isolated from the host's Docker image store — building an image
locally doesn't make it available inside the cluster. Combined with
`imagePullPolicy: Never` (deliberately set to avoid trying — and failing —
to pull a non-public image from a registry), the kubelet had no way to get
the image at all.

**Fix:**
```bash
docker build -f backend/Dockerfile.wp-prebaked -t kubecart/wp-prebaked:latest backend/
kind load docker-image kubecart/wp-prebaked:latest --name kubecart
```
`kind load docker-image` copies the image directly into every node's
containerd image cache. Needs to be re-run after every image rebuild, and
after every cluster recreate (a fresh cluster has an empty image cache).

**Why this makes a good interview answer:** shows understanding that KIND
nodes are isolated mini-VMs with their own container runtime, not just proxies
to the host Docker daemon — a common trip-up for people newer to
KIND-based local K8s development.

## Cluster corruption after host reboot

**Symptom:** `kubectl get nodes` failed with connection reset; the
apiserver container was crashlooping.

**Root cause:** `kube-apiserver` logs showed
`open /etc/kubernetes/pki/apiserver.crt: no such file or directory` — the
generated TLS material inside the KIND node's container filesystem was
gone, likely from a host-level disruption (reboot / Docker daemon restart)
that didn't cleanly preserve the container's writable layer.

**Fix:** KIND clusters aren't designed to survive this kind of corruption —
full recreate:
```bash
kind delete cluster --name kubecart
kind create cluster --name kubecart --config k8s/kind-cluster.yaml
```
Note this wipes anything not captured in version-controlled manifests
(ingress-nginx, any store namespaces) — had to reinstall ingress-nginx and
re-provision test stores afterward.
