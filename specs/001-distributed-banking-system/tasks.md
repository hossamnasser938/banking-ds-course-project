# Tasks: Distributed Banking System Foundation

**Input**: Design documents from `specs/001-distributed-banking-system/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Tests are required by the project constitution and this feature's resilience/consistency goals.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize monorepo structure, tooling, and base runtime wiring.

- [X] T001 Create monorepo folders and placeholders in `apps/api/`, `apps/admin-ui/`, `infra/docker/`, `infra/scripts/`, and `infra/monitoring/`
- [X] T002 Initialize backend NestJS project configuration in `apps/api/package.json`, `apps/api/tsconfig.json`, and `apps/api/src/main.ts`
- [X] T003 Initialize frontend React + Vite project configuration in `apps/admin-ui/package.json`, `apps/admin-ui/vite.config.ts`, and `apps/admin-ui/src/main.tsx`
- [X] T004 [P] Add shared environment templates in `.env.example`, `apps/api/.env.example`, and `apps/admin-ui/.env.example`
- [X] T005 [P] Configure linting/formatting in `apps/api/eslint.config.js`, `apps/admin-ui/eslint.config.js`, and root `package.json` scripts
- [X] T006 Create local orchestration baseline in `infra/docker/docker-compose.local.yml`
- [X] T007 [P] Add cloud overlay orchestration baseline in `infra/docker/docker-compose.cloud.yml`
- [X] T008 [P] Add bootstrap scripts in `infra/scripts/deploy-aws.sh`, `infra/scripts/deploy-gcp.sh`, and `infra/scripts/scale-node.sh`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement DDD foundations, shared infrastructure, and cross-story building blocks.

**CRITICAL**: No user story implementation begins before this phase is complete.

- [X] T009 Define bounded-context module boundaries in `apps/api/src/app.module.ts` and `apps/api/src/modules/README.md`
- [X] T010 [P] Implement shared config module in `apps/api/src/infrastructure/config/config.module.ts` and `apps/api/src/infrastructure/config/config.service.ts`
- [X] T011 [P] Implement database module and connection providers in `apps/api/src/infrastructure/database/database.module.ts` and `apps/api/src/infrastructure/database/database.providers.ts`
- [X] T012 Create initial schema migrations for users/accounts/transfers/idempotency/nodes/recovery in `apps/api/src/infrastructure/database/migrations/001_init.sql`
- [X] T013 [P] Implement domain entities for `User` and `Account` in `apps/api/src/modules/identity/domain/user.entity.ts` and `apps/api/src/modules/ledger/domain/account.entity.ts`
- [X] T014 [P] Implement domain entities for `Transfer` and `IdempotencyRecord` in `apps/api/src/modules/transfer/domain/transfer.entity.ts` and `apps/api/src/modules/transfer/domain/idempotency-record.entity.ts`
- [X] T015 [P] Implement domain entities for `SystemNode` and `RecoveryLog` in `apps/api/src/modules/observability/domain/system-node.entity.ts` and `apps/api/src/modules/observability/domain/recovery-log.entity.ts`
- [X] T016 Implement request metadata interceptor (`nodeId`, `zone`, `timestamp`) in `apps/api/src/infrastructure/http/response-metadata.interceptor.ts`
- [X] T017 Implement global error handling and validation pipeline in `apps/api/src/infrastructure/http/http-exception.filter.ts` and `apps/api/src/infrastructure/http/validation.pipe.ts`
- [X] T018 Implement health check framework and stale telemetry evaluator in `apps/api/src/modules/health/health.controller.ts` and `apps/api/src/modules/health/health.service.ts`

**Checkpoint**: Foundation ready; user stories can proceed.

---

## Phase 3: User Story 1 - Secure Account Access and Balance View (Priority: P1) 🎯 MVP

**Goal**: Enable user registration, login, and authenticated balance retrieval.

**Independent Test**: Register a user, login, call balance endpoint with token, receive correct balance with metadata.

### Tests for User Story 1

- [X] T019 [P] [US1] Add contract tests for `/auth/register`, `/auth/login`, and `/accounts/me/balance` in `apps/api/tests/contract/auth-balance.contract.spec.ts`
- [X] T020 [P] [US1] Add integration test for register-login-balance journey in `apps/api/tests/integration/us1-auth-balance.integration.spec.ts`
- [X] T021 [P] [US1] Add frontend integration test for auth and balance screens in `apps/admin-ui/tests/us1-auth-balance.spec.tsx`

### Implementation for User Story 1

- [X] T022 [P] [US1] Implement identity DTOs and validators in `apps/api/src/modules/identity/api/dto/register.dto.ts` and `apps/api/src/modules/identity/api/dto/login.dto.ts`
- [X] T023 [P] [US1] Implement identity repository and account bootstrap on registration in `apps/api/src/modules/identity/infrastructure/identity.repository.ts`
- [X] T024 [US1] Implement auth service and JWT issuance in `apps/api/src/modules/identity/application/auth.service.ts`
- [X] T025 [US1] Implement auth controller endpoints in `apps/api/src/modules/identity/api/auth.controller.ts`
- [X] T026 [US1] Implement JWT guard and role decorator in `apps/api/src/modules/identity/api/guards/jwt-auth.guard.ts` and `apps/api/src/modules/identity/api/decorators/roles.decorator.ts`
- [X] T027 [US1] Implement ledger read service for current user balance in `apps/api/src/modules/ledger/application/balance.service.ts`
- [X] T028 [US1] Implement balance controller endpoint in `apps/api/src/modules/ledger/api/balance.controller.ts`
- [X] T029 [US1] Implement auth and balance frontend views in `apps/admin-ui/src/pages/LoginPage.tsx`, `apps/admin-ui/src/pages/RegisterPage.tsx`, and `apps/admin-ui/src/pages/BalancePage.tsx`

**Checkpoint**: US1 is independently functional and testable.

---

## Phase 4: User Story 2 - Reliable Money Transfer Under Failures (Priority: P1)

**Goal**: Execute transfer operations exactly once under retries/failures with strong consistency.

**Independent Test**: Submit transfer, simulate timeout/failure, retry with same key, confirm one financial effect and replayed result.

### Tests for User Story 2

- [X] T030 [P] [US2] Add contract tests for `/transfers` idempotency behaviors in `apps/api/tests/contract/transfers.contract.spec.ts`
- [X] T031 [P] [US2] Add integration tests for successful/rejected transfer invariants in `apps/api/tests/integration/us2-transfer.integration.spec.ts`
- [X] T032 [P] [US2] Add resilience test for retry after timeout with same idempotency key in `apps/api/tests/resilience/us2-idempotent-retry.resilience.spec.ts`

### Implementation for User Story 2

- [X] T033 [P] [US2] Implement transfer request/response DTOs and validators in `apps/api/src/modules/transfer/api/dto/create-transfer.dto.ts` and `apps/api/src/modules/transfer/api/dto/transfer-response.dto.ts`
- [X] T034 [P] [US2] Implement idempotency repository with request hash checks in `apps/api/src/modules/transfer/infrastructure/idempotency.repository.ts`
- [X] T035 [P] [US2] Implement transfer repository with transactional debit/credit primitives in `apps/api/src/modules/transfer/infrastructure/transfer.repository.ts`
- [X] T036 [US2] Implement transfer aggregate invariant policies in `apps/api/src/modules/transfer/domain/transfer-policy.service.ts`
- [X] T037 [US2] Implement transfer application service (commit/reject/replay) in `apps/api/src/modules/transfer/application/transfer.service.ts`
- [X] T038 [US2] Implement transfer controller with `Idempotency-Key` handling in `apps/api/src/modules/transfer/api/transfer.controller.ts`
- [X] T039 [US2] Implement zone failover recovery log writes in `apps/api/src/modules/observability/application/recovery-log.service.ts`
- [X] T040 [US2] Implement transfer frontend flow in `apps/admin-ui/src/pages/TransferPage.tsx` and `apps/admin-ui/src/services/transferApi.ts`
- [X] T041 [US2] Add runbook note for retry/failover verification in `specs/001-distributed-banking-system/quickstart.md`

**Checkpoint**: US2 is independently functional and testable.

---

## Phase 5: User Story 3 - Admin Observability of Distributed Components (Priority: P2)

**Goal**: Provide admin-only observability view for node/zone health and stale telemetry visibility.

**Independent Test**: Login as admin, view node health states, verify non-admin access denial and stale node reporting.

### Tests for User Story 3

- [X] T042 [P] [US3] Add contract tests for `/admin/nodes/health` auth and payload in `apps/api/tests/contract/observability.contract.spec.ts`
- [X] T043 [P] [US3] Add integration tests for admin access and non-admin rejection in `apps/api/tests/integration/us3-observability.integration.spec.ts`
- [X] T044 [P] [US3] Add frontend test for node dashboard rendering and unknown-state badge in `apps/admin-ui/tests/us3-observability.spec.tsx`

### Implementation for User Story 3

- [X] T045 [P] [US3] Implement node health repository and stale-state query in `apps/api/src/modules/observability/infrastructure/node-health.repository.ts`
- [X] T046 [US3] Implement observability service and node-state mapping in `apps/api/src/modules/observability/application/observability.service.ts`
- [X] T047 [US3] Implement admin observability controller endpoint in `apps/api/src/modules/observability/api/observability.controller.ts`
- [X] T048 [US3] Enforce admin role authorization on observability routes in `apps/api/src/modules/observability/api/observability.module.ts`
- [X] T049 [US3] Implement admin dashboard page in `apps/admin-ui/src/pages/AdminObservabilityPage.tsx`
- [X] T050 [US3] Implement node health polling client in `apps/admin-ui/src/services/observabilityApi.ts`
- [X] T051 [US3] Add navigation guard for admin-only observability route in `apps/admin-ui/src/router/index.tsx`

**Checkpoint**: US3 is independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening across all stories and deployment environments.

- [X] T052 [P] Add OpenAPI linting and validation script in `apps/api/package.json` and `.github/workflows/contracts.yml`
- [X] T053 [P] Add local TLS and reverse-proxy configuration in `infra/docker/nginx/default.conf` and `infra/docker/nginx/certs/README.md`
- [X] T054 Add Docker Compose service scaling profiles in `infra/docker/docker-compose.local.yml` and `infra/docker/docker-compose.cloud.yml`
- [X] T055 [P] Add cloud deployment script implementation details in `infra/scripts/deploy-aws.sh` and `infra/scripts/deploy-gcp.sh`
- [X] T056 [P] Add k6 smoke and resilience scripts in `apps/api/tests/resilience/k6-smoke.js` and `apps/api/tests/resilience/k6-failover.js`
- [X] T057 Update project run-and-validate instructions in `specs/001-distributed-banking-system/quickstart.md`
- [X] T058 Execute full feature verification checklist and document results in `specs/001-distributed-banking-system/checklists/requirements.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2 completion.
- **Phase 4 (US2)**: Depends on Phase 2 completion; can run in parallel with US1 after auth primitives are available.
- **Phase 5 (US3)**: Depends on Phase 2 completion; can run in parallel with US2.
- **Phase 6 (Polish)**: Depends on completion of selected user stories.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after foundational tasks.
- **US2 (P1)**: Depends on foundational auth/ledger primitives; independently testable from admin UI work.
- **US3 (P2)**: Depends on foundational identity and health modules; independently testable from transfer flow.

### Within Each User Story

- Write contract/integration tests before implementation tasks.
- Implement DTOs/entities/repositories before application services.
- Implement services before controllers/UI integration.
- Complete story acceptance checks before moving to final polish.

---

## Parallel Execution Examples

### User Story 1

```bash
Task: T019 apps/api/tests/contract/auth-balance.contract.spec.ts
Task: T020 apps/api/tests/integration/us1-auth-balance.integration.spec.ts
Task: T021 apps/admin-ui/tests/us1-auth-balance.spec.tsx
```

```bash
Task: T022 apps/api/src/modules/identity/api/dto/register.dto.ts
Task: T023 apps/api/src/modules/identity/infrastructure/identity.repository.ts
```

### User Story 2

```bash
Task: T030 apps/api/tests/contract/transfers.contract.spec.ts
Task: T031 apps/api/tests/integration/us2-transfer.integration.spec.ts
Task: T032 apps/api/tests/resilience/us2-idempotent-retry.resilience.spec.ts
```

```bash
Task: T033 apps/api/src/modules/transfer/api/dto/create-transfer.dto.ts
Task: T034 apps/api/src/modules/transfer/infrastructure/idempotency.repository.ts
Task: T035 apps/api/src/modules/transfer/infrastructure/transfer.repository.ts
```

### User Story 3

```bash
Task: T042 apps/api/tests/contract/observability.contract.spec.ts
Task: T043 apps/api/tests/integration/us3-observability.integration.spec.ts
Task: T044 apps/admin-ui/tests/us3-observability.spec.tsx
```

```bash
Task: T045 apps/api/src/modules/observability/infrastructure/node-health.repository.ts
Task: T049 apps/admin-ui/src/pages/AdminObservabilityPage.tsx
Task: T050 apps/admin-ui/src/services/observabilityApi.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end-to-end.
3. Validate register-login-balance journey plus metadata output.
4. Demo local execution as first milestone.

### Incremental Delivery

1. Add US2 transfer reliability with idempotency and resilience checks.
2. Add US3 observability dashboard and admin access controls.
3. Run polish phase for TLS, scaling scripts, cloud deployment scripts, and final verification.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. Then parallelize:
   - Developer A: US1 backend/frontend
   - Developer B: US2 transfer/idempotency
   - Developer C: US3 observability
3. Merge via contract tests and shared quickstart validation.

---

## Notes

- All tasks use the required checklist format with Task ID and file paths.
- `[P]` tasks are scoped to independent files and can run concurrently.
- User story labels are present only for story phases.
- Constitution alignment is enforced by including invariant, contract, observability, and resilience tasks.
