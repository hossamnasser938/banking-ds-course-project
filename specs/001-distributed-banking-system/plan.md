# Implementation Plan: Distributed Banking System Foundation

**Branch**: `001-distributed-banking-system` | **Date**: 2026-05-31 | **Spec**: `specs/001-distributed-banking-system/spec.md`

**Input**: Feature specification from `specs/001-distributed-banking-system/spec.md`

## Summary

Build a minimal-functionality banking platform focused on distributed-system guarantees: active service replicas across two zones, strong consistency in the data layer, idempotent transfer retries, encrypted communication, and admin observability of node health. The design follows your initial architecture sketch with an authentication/authorization layer, load balancing across zone-local transfer APIs, and replicated database nodes.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x (NestJS backend and React frontend)

**Primary Dependencies**:
- Backend: `@nestjs/core`, `@nestjs/common`, `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/typeorm` or `@nestjs/sequelize`, `passport-jwt`, `class-validator`
- UI: `react`, `vite`, `react-router-dom`
- Infra: Docker Compose, NGINX (or cloud managed L7 LB), PostgreSQL 16

**Storage**:
- PostgreSQL 16 with one primary and at least two replicas across zones
- Synchronous replication for transfer-critical writes
- Idempotency table (request key -> transfer outcome)
- Outbox/recovery log table for replica/node catch-up

**Testing**:
- Unit and integration tests with `jest` and NestJS testing utilities
- Frontend component and integration tests with `vitest` and React Testing Library
- Contract tests against OpenAPI definitions
- Failure/availability tests with scripted container/node stops
- Lightweight load/scalability checks via `k6`

**Target Platform**:
- Local: Docker Compose on Linux/macOS/Windows (developer laptop)
- Cloud: AWS or GCP VM/container-host setup across two zones (free-tier-capable where possible)

**Project Type**: Distributed web service with admin dashboard

**Bounded Contexts**:
- **Identity and Access**: user registration, login, role-based authorization (`user`, `admin`)
- **Transfer Processing**: transfer command handling, idempotency key enforcement, retry-safe execution
- **Account Ledger**: account balances, debit/credit invariants, strong-consistency write guarantees
- **Observability**: node/zone health tracking, stale telemetry reporting, admin dashboard data

**Aggregate Boundaries**:
- **UserAggregate**: owns credential and role lifecycle invariants
- **AccountAggregate**: owns single-account-per-user and non-negative balance invariant
- **TransferAggregate**: owns exactly-once financial effect per idempotency key and atomic state transitions
- **NodeHealthAggregate**: owns health status transitions (`HEALTHY`, `UNHEALTHY`, `UNKNOWN`)

**Performance Goals**:
- Prioritize correctness/availability over raw throughput
- Balance read response p95 <= 500ms in normal load
- Transfer response p95 <= 800ms in normal load
- Health-state propagation to admin view <= 15s

**Constraints**:
- At least two app replicas in separate zones
- Strong consistency for financial state
- Idempotent retries for transfer operations
- Encrypted communication in transit end-to-end
- Docker-based orchestration only (no Kubernetes)
- Add/remove nodes through configuration/infrastructure changes, not code changes

**Scale/Scope**:
- Academic project with minimal business functionality (register/login/balance/transfer)
- 100 concurrent active users target for demonstration
- Single account per user model

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Principle I (Ubiquitous Language Integrity): PASS
  - Domain terms in this plan align with spec entities and glossary terms.
- Principle II (Bounded Context Contracts): PASS
  - Context boundaries and cross-context interface expectations are explicitly defined.
- Principle III (Aggregate Consistency and Invariants): PASS
  - Strong consistency, idempotency, and atomic transfer constraints are preserved.
- Principle IV (Domain Events and Observability): PASS
  - Recovery logging and node/zone observability are included in architecture and artifacts.
- Principle V (Evolutionary Architecture and Test Gates): PASS
  - Unit, integration, contract, and resilience testing are planned.
- **Gate Status (Pre-Research): PASS**

## Project Structure

### Documentation (this feature)

```text
specs/001-distributed-banking-system/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── banking-api.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── api/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── transfer/
│   │   │   ├── balance/
│   │   │   ├── observability/
│   │   │   ├── idempotency/
│   │   │   └── health/
│   │   └── infrastructure/
│   │       ├── database/
│   │       └── messaging/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       ├── contract/
│       └── resilience/
└── admin-ui/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   └── services/
    └── tests/

infra/
├── docker/
│   ├── docker-compose.local.yml
│   ├── docker-compose.cloud.yml
│   └── nginx/
├── scripts/
│   ├── deploy-aws.sh
│   ├── deploy-gcp.sh
│   └── scale-node.sh
└── monitoring/
    ├── prometheus/
    └── grafana/
```

**Structure Decision**: Use a multi-app repository with separate API and admin UI applications plus infra-as-code scripts. This matches the need for both local and cloud execution while keeping distributed-system infrastructure artifacts explicit and reviewable.

## Complexity Tracking

No constitution violations requiring justification.

## Phase 0 Research Output (Completed)

Research decisions are documented in `specs/001-distributed-banking-system/research.md` and resolve all technical unknowns in this plan.

## Phase 1 Design Output (Completed)

- `specs/001-distributed-banking-system/data-model.md`
- `specs/001-distributed-banking-system/contracts/banking-api.openapi.yaml`
- `specs/001-distributed-banking-system/quickstart.md`

## Constitution Check (Post-Design)

- Principle I (Ubiquitous Language Integrity): PASS
  - `spec.md`, `data-model.md`, `contracts/`, and `quickstart.md` use consistent domain terms.
- Principle II (Bounded Context Contracts): PASS
  - API contract reflects explicit boundaries between identity, ledger, transfer, and observability.
- Principle III (Aggregate Consistency and Invariants): PASS
  - Data model captures transfer/account/idempotency invariants and replay-safe transitions.
- Principle IV (Domain Events and Observability): PASS
  - Recovery logs and node health visibility are modeled and surfaced for admin use.
- Principle V (Evolutionary Architecture and Test Gates): PASS
  - Planned test strategy includes aggregate, contract, integration, and resilience coverage.
- **Gate Status (Post-Design): PASS**
