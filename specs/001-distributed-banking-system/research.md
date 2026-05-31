# Research: Distributed Banking System Foundation

## Decision 1: Service topology by zone

- **Decision**: Deploy one Transfer API replica per zone behind a load balancer, plus shared authentication/authorization and admin observability entrypoints.
- **Rationale**: Matches the initial design sketch, keeps business logic minimal, and demonstrates failover/availability behavior clearly for coursework.
- **Alternatives considered**:
  - Single-zone deployment: rejected because it cannot validate zone failover.
  - Active-passive app deployment only: rejected because active-active is better for resilience demonstration.

## Decision 2: Data consistency model

- **Decision**: Use PostgreSQL with one primary and at least two replicas, configured for synchronous replication on transfer-critical writes.
- **Rationale**: Supports strong consistency expectations for banking balances while staying Docker-friendly for local and VM-based cloud deployment.
- **Alternatives considered**:
  - Asynchronous replication: rejected due to potential stale reads and lost-write windows during failover.
  - Eventual consistency stores: rejected due to strict financial correctness requirements.

## Decision 3: Idempotent retry strategy

- **Decision**: Require a transfer idempotency key on each transfer request and persist request-to-outcome mapping in the database.
- **Rationale**: Guarantees timeout/unknown-response retries are either completed once or returned from prior outcome without duplication.
- **Alternatives considered**:
  - Client-side deduplication only: rejected as untrusted and insufficient.
  - Time-window-only duplicate detection: rejected due to risk of false positives/negatives.

## Decision 4: Zone failure recovery path

- **Decision**: On zone outage, continue processing through healthy zone(s) and persist recovery log entries for unavailable nodes to sync on return.
- **Rationale**: Aligns directly with edge-case expectations and supports deterministic recovery evidence for demonstrations.
- **Alternatives considered**:
  - Full request rejection during partial outage: rejected due to availability goals.
  - Best-effort replay without logging: rejected because recovery behavior becomes unverifiable.

## Decision 5: Observability scope

- **Decision**: Provide admin-only node/zone health page and include `nodeId` and `zone` metadata in API responses.
- **Rationale**: Satisfies required observability outcomes and enables transparent routing/failover validation during tests.
- **Alternatives considered**:
  - Logs-only visibility: rejected because it does not meet explicit admin interface requirement.
  - Admin interface without response metadata: rejected because it limits request-level traceability.

## Decision 6: Local and cloud deployment parity

- **Decision**: Use Docker Compose for local and cloud VM/container-host deployments, with environment overlays but same service graph.
- **Rationale**: Ensures developers can run the same architecture locally and deploy to either AWS or GCP with minimal drift.
- **Alternatives considered**:
  - Kubernetes-based cloud deployment: rejected per project constraint.
  - Different local/cloud stacks: rejected due to higher configuration drift risk.

## Decision 7: Cloud provider strategy

- **Decision**: Treat AWS and GCP as supported targets; require successful deployment to at least one for feature acceptance.
- **Rationale**: Matches team familiarity while keeping scope realistic for an academic timeline.
- **Alternatives considered**:
  - Multi-cloud deployment as mandatory: rejected as unnecessary scope expansion.
  - Provider-agnostic only with no scripts: rejected because explicit deployment repeatability is required.

## Decision 8: Security baseline

- **Decision**: Enforce role-based authorization (`user`, `admin`) and encrypt all communication in transit (TLS at ingress and inter-service links where supported).
- **Rationale**: Meets required security outcomes with clear verifiability.
- **Alternatives considered**:
  - Authentication without role enforcement: rejected due to admin-only observability requirement.
  - Unencrypted internal traffic: rejected because end-to-end encryption is required.
