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
