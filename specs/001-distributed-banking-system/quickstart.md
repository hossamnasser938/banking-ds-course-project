# Quickstart: Distributed Banking System Foundation

## Purpose

Run the project architecture in two environments:
- Local developer machine (Docker Compose)
- Cloud deployment on either AWS or GCP (Docker on zone-separated hosts)

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- GNU Make (optional)
- OpenSSL (for local TLS certificates)
- Cloud account on AWS or GCP (free-tier-capable resources where possible)

## Local Run

1. Copy environment template:

```bash
cp .env.example .env
```

2. Start full stack:

```bash
docker compose -f infra/docker/docker-compose.local.yml up -d
```

3. Verify service health:

```bash
docker compose -f infra/docker/docker-compose.local.yml ps
```

4. Verify API metadata includes node/zone:

```bash
curl -s http://localhost:8080/accounts/me/balance | jq
```

Expected: response includes metadata fields for `nodeId` and `zone`.

5. Stop stack:

```bash
docker compose -f infra/docker/docker-compose.local.yml down
```

## Cloud Run (AWS or GCP)

### Deployment Topology

- 1 load balancer entrypoint
- 2 API replicas in distinct zones
- PostgreSQL primary + replicas distributed across zones
- Admin observability service

### AWS Path

1. Provision two zones in one region with VM/container-capable nodes.
2. Configure network security to allow TLS ingress and private east-west traffic.
3. Deploy services with:

```bash
bash infra/scripts/deploy-aws.sh
```

### GCP Path

1. Provision two zones in one region with VM/container-capable nodes.
2. Configure firewall rules for TLS ingress and private service communication.
3. Deploy services with:

```bash
bash infra/scripts/deploy-gcp.sh
```

### Post-Deploy Validation

- Run registration, login, balance, and transfer API smoke tests.
- Perform a controlled API replica shutdown and verify requests continue through healthy zone.
- Retry a transfer request with the same `Idempotency-Key` and verify single financial effect.
- Confirm admin observability page shows node states and reports stale/unobservable nodes clearly.
- Validate stale-node SLA: simulate stale telemetry and verify dashboard status updates to `UNKNOWN` within 15 seconds.

### Retry and Failover Runbook

1. Submit a transfer request and record `Idempotency-Key`.
2. Simulate timeout/failure (e.g., stop one API replica).
3. Resubmit the same transfer request with the same key.
4. Confirm response replay semantics: no duplicate debit/credit effect.
5. Verify recovery log entries are generated for post-recovery synchronization.

## Scaling Test

Add one API node without code changes:

```bash
bash infra/scripts/scale-node.sh api +1
```

Verify traffic is routed to the newly added node and metadata reflects it.

## Notes

- Local and cloud deployments must keep the same service graph and contract semantics.
- If exact target zones are unavailable (e.g., Egypt), use closest available alternatives and document mapping.
