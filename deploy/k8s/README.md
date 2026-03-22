# Kubernetes (optional)

For production or multi-replica deployment. Prerequisites: PostgreSQL, Redis, and ClickHouse — use managed services or deploy them separately (see [docker-compose.yml](../../docker-compose.yml) for local reference).

**Before applying:** edit [secrets.yaml](secrets.yaml) (or inject secrets from your secret manager); never commit real credentials.

## Apply

Create the namespace, then apply the rest into that namespace:

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml -f deploy/k8s/secrets.yaml -f deploy/k8s/backend-deployment.yaml -f deploy/k8s/frontend-deployment.yaml -n praesagium
```

Build and push images to your registry. **Production:** tag images with a version (for example `praesagium-backend:1.2.3`) and update the Deployment manifests; avoid relying on `:latest`. Manifests set `imagePullPolicy: IfNotPresent` and HTTP **liveness/readiness** probes on `/health` (backend) and `/` (frontend).

For secret injection, prefer your cluster’s secret store (e.g. Sealed Secrets, External Secrets) rather than committing real values.
