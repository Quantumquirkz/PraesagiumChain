# Kubernetes (optional). For production or multi-replica deployment.
# Prerequisites: PostgreSQL, Redis, ClickHouse — use managed services or deploy separately.
# Apply: kubectl apply -f k8s/namespace.yaml && kubectl apply -f k8s/ -n praesagium
# Fill k8s/secrets.yaml (or use a secret manager) before applying.
