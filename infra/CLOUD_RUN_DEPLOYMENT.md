# Cloud Run Deployment (Course Scope)

This project can be deployed to GCP Cloud Run without VMs.

## Services

- `banking-auth` (authentication)
- `banking-banking-a` (banking replica A)
- `banking-banking-b` (banking replica B)
- `banking-observability` (observability)
- `banking-ui` (frontend)

## Prerequisites

- `gcloud` CLI authenticated to the target project
- Docker installed locally
- A PostgreSQL endpoint (Cloud SQL or managed Postgres)

## One-script Deployment

Use:

```bash
PROJECT_ID="<your-project-id>" \
REGION="us-central1" \
DB_HOST="<db-host>" \
DB_PORT="5432" \
DB_USER="<db-user>" \
DB_PASSWORD="<db-password>" \
DB_NAME="banking" \
AUTH_INTERNAL_API_KEY="<shared-key>" \
infra/scripts/deploy-gcp.sh
```

Use layered env files (no duplication):

```bash
cp infra/env.gcp.base.example infra/env.gcp.base
cp infra/env.gcp.us-central1.example infra/env.gcp.region
# edit values in infra/env.gcp.base and infra/env.gcp.region
infra/scripts/deploy-gcp-from-env.sh
```

For deploying another region:

```bash
cp infra/env.gcp.europe-west1.example infra/env.gcp.region
# update DB_HOST in infra/env.gcp.region for that region
infra/scripts/deploy-gcp-from-env.sh
```

You can also pass custom file paths:

```bash
infra/scripts/deploy-gcp-from-env.sh path/to/base.env path/to/region.env
```

For Cloud SQL unix socket mode instead of host/port:

```bash
PROJECT_ID="<your-project-id>" \
REGION="us-central1" \
DB_SOCKET_PATH="/cloudsql/<project>:<region>:<instance>" \
DB_USER="<db-user>" \
DB_PASSWORD="<db-password>" \
DB_NAME="banking" \
AUTH_INTERNAL_API_KEY="<shared-key>" \
infra/scripts/deploy-gcp.sh
```

## Environment Matrix

### Shared DB settings (auth + banking replicas)

- `DB_HOST` or `DB_SOCKET_PATH`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL`
- `DB_SSL_REJECT_UNAUTHORIZED`

### Authentication

- `NODE_ID`
- `ZONE`
- `AUTH_INTERNAL_API_KEY`

### Banking replicas

- `NODE_ID`
- `ZONE`
- `AUTH_SERVICE_URL`
- `AUTH_INTERNAL_API_KEY`
- `AUTH_CLIENT_TIMEOUT_MS`
- `AUTH_CLIENT_MAX_RETRIES`
- `AUTH_CLIENT_RETRY_BACKOFF_MS`

### Observability

- `NODE_ID`
- `ZONE`
- `AUTH_SERVICE_URL`
- `AUTH_INTERNAL_API_KEY`
- `AUTH_CLIENT_TIMEOUT_MS`
- `AUTH_CLIENT_MAX_RETRIES`
- `AUTH_CLIENT_RETRY_BACKOFF_MS`
- `OBS_NODE_HEALTH_TIMEOUT_MS`
- `OBS_NODE_HEALTH_MAX_RETRIES`
- `OBS_NODE_HEALTH_RETRY_BACKOFF_MS`
- `OBSERVED_SERVICES_JSON`

### UI

- No required runtime env for API base when deployed behind same host path routing.
- Optional build override: `VITE_API_BASE_URL`.

## Important Notes

- UI defaults to same-origin API calls in non-dev mode.
- For the cleanest setup, configure one HTTPS load balancer host with path routing:
  - `/auth/*` -> auth service
  - `/accounts/*` and `/transfers*` -> banking services/LB target
  - `/admin/nodes/*` -> observability service
  - `/` -> UI service
- Option B (recommended): use one banking Cloud Run service with two tagged revisions (`a`, `b`) and let admin routing controls change Cloud Run traffic split.
- Admin observability routing controls (`/admin/nodes/routing`) require the observability Cloud Run service account to have permissions to update Cloud Run services traffic:
  - `roles/run.admin` (or a custom role with `run.services.get` and `run.services.update`)
