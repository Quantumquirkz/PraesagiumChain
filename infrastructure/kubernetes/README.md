# Kubernetes (optional)

For production or multi-replica deployment. Prerequisites: PostgreSQL, Redis, and ClickHouse — use managed services or deploy them separately (see [docker-compose.yml](../../docker-compose.yml) for local reference).

**Before applying:** replace `REPLACE_*` placeholders in [secrets.yaml](secrets.yaml), or sync secrets via External Secrets / Sealed Secrets (see below); never commit real credentials.

## Apply

Create the namespace, then apply the rest into that namespace:

```bash
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/configmap.yaml -f infrastructure/kubernetes/secrets.yaml -f infrastructure/kubernetes/backend-deployment.yaml -f infrastructure/kubernetes/frontend-deployment.yaml -n praesagium
```

Build and push images to your registry. **Production:** tag images with a version (for example `praesagium-backend:1.2.3`) and update the Deployment manifests; avoid relying on `:latest`. Manifests set `imagePullPolicy: IfNotPresent` and HTTP **liveness/readiness** probes on `/health` (backend) and `/` (frontend).

For secret injection, prefer your cluster’s secret store (e.g. Sealed Secrets, External Secrets) rather than committing real values.

### External Secrets Operator (example)

After installing [External Secrets](https://external-secrets.io/), create an `ExternalSecret` that targets `praesagium-secrets` and maps remote keys (e.g. AWS Secrets Manager, GCP Secret Manager) to `DATABASE_URL`, `REDIS_URL`, and `CLICKHOUSE_URL`. Do not commit ARNs or secret names; store them in your IaC (Terraform, Pulumi) or CI variables.
