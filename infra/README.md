# Infrastructure

This folder contains Docker and environment setup for running the project in different modes.

## Compose Files

- `docker/docker-compose.local.yml`
  - Simple local development setup.
  - Single banking node.

- `docker/docker-compose.local-ha.yml`
  - Local high-availability simulation.
  - Two banking nodes behind an internal Nginx load balancer.
  - Use this when validating observability across multiple banking nodes.

- `docker/docker-compose.cloud.yml`
  - Cloud-oriented layout with separated services and load balancers.

## Quick Commands

Run simple local mode:

```bash
docker compose -f infra/docker/docker-compose.local.yml up -d --remove-orphans
```

Run local HA mode:

```bash
docker compose -f infra/docker/docker-compose.local-ha.yml up -d --remove-orphans
```

Stop a mode:

```bash
docker compose -f <compose-file> down
```

Examples:

```bash
docker compose -f infra/docker/docker-compose.local.yml down
docker compose -f infra/docker/docker-compose.local-ha.yml down
```

## Resilience Tuning (Inter-service Calls)

Both compose files set these defaults for banking and observability auth-client calls:

- `AUTH_CLIENT_TIMEOUT_MS=1500`
- `AUTH_CLIENT_MAX_RETRIES=2`
- `AUTH_CLIENT_RETRY_BACKOFF_MS=200`

Observed node health probing (observability service) uses:

- `OBS_NODE_HEALTH_TIMEOUT_MS=1200`
- `OBS_NODE_HEALTH_MAX_RETRIES=1`
- `OBS_NODE_HEALTH_RETRY_BACKOFF_MS=200`

## Database UI (pgAdmin)

pgAdmin is included in both local modes and is available at:

- [http://localhost:5050](http://localhost:5050)

Sign in to pgAdmin with:

- Email: `admin@banking.com`
- Password: `admin123`

Then create a new server connection in pgAdmin using:

- Host: `postgres-primary`
- Port: `5432`
- Username: `postgres`
- Password: `postgres`
- Database: `banking`

## HA Load Balancer Validation

Use this script to validate request distribution and failover behavior in HA mode:

```bash
infra/scripts/validate-load-balancer-ha.sh
```

What it does:

- Creates a temporary user and obtains a token.
- Sends repeated `/accounts/me/balance` requests and summarizes serving node distribution.
- Stops `banking-service-a`, sends more requests, and verifies traffic is no longer routed to that replica.
- Restarts `banking-service-a` after the test.
