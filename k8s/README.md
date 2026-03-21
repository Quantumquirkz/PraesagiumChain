# Kubernetes (optional)

For production or multi-replica deployment. Prerequisites: PostgreSQL, Redis, and ClickHouse — use managed services or deploy them separately (see [docker-compose.yml](../docker-compose.yml) for local reference).

**Before applying:** edit [secrets.yaml](secrets.yaml) (or inject secrets from your secret manager); never commit real credentials.

## Apply

Create the namespace, then apply the rest into that namespace:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml -f k8s/secrets.yaml -f k8s/backend-deployment.yaml -f k8s/frontend-deployment.yaml -n praesagium
```

Build and push images `praesagium-backend:latest` and `praesagium-frontend:latest` to a registry your cluster can pull from, or use `imagePullPolicy` and loaded images as appropriate for your environment.
