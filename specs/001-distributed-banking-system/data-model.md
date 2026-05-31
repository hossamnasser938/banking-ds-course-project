# Data Model: Distributed Banking System Foundation

## Entity: User

**Purpose**: Represents an authenticated actor in the system.

**Fields**:
- `userId` (UUID, immutable)
- `email` (unique, validated)
- `passwordHash` (write-only credential hash)
- `role` (`user` or `admin`)
- `createdAt` (timestamp)
- `lastLoginAt` (timestamp, nullable)

**Validation Rules**:
- Email must be unique and valid format.
- Role must be one of allowed values.

## Entity: Account

**Purpose**: Stores a single banking account per user.

**Fields**:
- `accountId` (UUID, immutable)
- `userId` (FK -> User.userId, unique one-to-one)
- `balance` (decimal, non-negative for business rules unless overdraft explicitly added later)
- `currency` (default project currency)
- `updatedAt` (timestamp)

**Validation Rules**:
- One account per user.
- Balance updates must occur in transactional boundaries.

## Entity: Transfer

**Purpose**: Represents a money movement operation from source account to destination account.

**Fields**:
- `transferId` (UUID, immutable)
- `idempotencyKey` (string, unique per client/request scope)
- `sourceAccountId` (FK -> Account.accountId)
- `destinationAccountId` (FK -> Account.accountId)
- `amount` (decimal > 0)
- `status` (`PENDING`, `COMMITTED`, `REJECTED`)
- `rejectionReason` (nullable text)
- `createdAt` (timestamp)
- `committedAt` (timestamp, nullable)

**Validation Rules**:
- Source and destination accounts must differ.
- Amount must be positive and within allowed precision.
- Transfer commit requires sufficient source balance.
- Duplicate idempotency key must return prior outcome without re-applying debit/credit.

## Entity: IdempotencyRecord

**Purpose**: Stores deterministic mapping from idempotency key to transfer outcome.

**Fields**:
- `idempotencyKey` (PK)
- `requestHash` (hash of canonical request payload)
- `transferId` (FK -> Transfer.transferId)
- `outcomeStatus` (`COMMITTED`, `REJECTED`, `IN_PROGRESS`)
- `responseSnapshot` (serialized response payload)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Validation Rules**:
- Same key with different request hash must be rejected as invalid reuse.
- `responseSnapshot` must be returned for completed retries.

## Entity: SystemNode

**Purpose**: Represents an application or data component instance shown in observability.

**Fields**:
- `nodeId` (string)
- `componentType` (`api`, `db`, `load-balancer`, `observability`)
- `zone` (string, e.g., `dubai`, `singapore`)
- `status` (`HEALTHY`, `UNHEALTHY`, `UNKNOWN`)
- `lastHealthAt` (timestamp, nullable)
- `lastObservedAt` (timestamp)

**Validation Rules**:
- Nodes missing health update beyond threshold must transition to `UNKNOWN`.

## Entity: RecoveryLog

**Purpose**: Tracks state needing synchronization when unavailable replicas/nodes recover.

**Fields**:
- `logId` (UUID)
- `eventType` (`TRANSFER_COMMITTED`, `BALANCE_UPDATED`, `NODE_RECOVERY_REQUIRED`)
- `sourceNodeId` (string)
- `targetNodeId` (string, nullable)
- `zone` (string)
- `payload` (structured JSON)
- `syncStatus` (`PENDING`, `SYNCED`, `FAILED`)
- `createdAt` (timestamp)
- `syncedAt` (timestamp, nullable)

**Validation Rules**:
- Recovery entries must be append-only until marked `SYNCED`.
- Failed sync attempts must keep retry metadata for auditability.

## Relationships

- `User` 1:1 `Account`
- `Account` 1:N outgoing `Transfer` (source)
- `Account` 1:N incoming `Transfer` (destination)
- `Transfer` 1:1 `IdempotencyRecord` (through `idempotencyKey`)
- `SystemNode` 1:N `RecoveryLog` (as source or target)

## State Transitions

## Transfer State Machine

1. `PENDING` -> `COMMITTED`
   - Conditions: valid accounts, sufficient balance, transactional commit succeeds.
2. `PENDING` -> `REJECTED`
   - Conditions: invalid destination, insufficient balance, validation failure.
3. `COMMITTED` -> `COMMITTED` (retry replay)
   - Conditions: same idempotency key and request hash; response is replayed.
4. `REJECTED` -> `REJECTED` (retry replay)
   - Conditions: same idempotency key and request hash; rejection is replayed.

## Node Health State

1. `HEALTHY` -> `UNHEALTHY` when active health check fails.
2. `UNHEALTHY` -> `HEALTHY` when checks pass again.
3. `HEALTHY|UNHEALTHY` -> `UNKNOWN` when telemetry is stale or absent beyond threshold.
