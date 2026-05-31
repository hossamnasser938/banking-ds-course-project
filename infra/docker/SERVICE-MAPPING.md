# Revised Service Mapping

This repository now maps to the revised architecture as follows:

## Services and Code Ownership

- `ui`
  - Code: `services/ui/`
  - Dockerfile: `services/ui/Dockerfile`
  - Purpose: Shared frontend for user and admin experiences.

- `authentication-service`
  - Service folder: `services/authentication/`
  - NestJS code: `services/authentication/src/**`
  - Dockerfile: `services/authentication/Dockerfile`
  - Purpose: Registration, login, token issuance/validation.

- `banking-service` (replicated per zone)
  - Service folder: `services/banking/`
  - NestJS code: `services/banking/src/**`
  - Dockerfile: `services/banking/Dockerfile`
  - Purpose: Account balance and transfer operations.

- `observability-service`
  - Service folder: `services/observability/`
  - NestJS code: `services/observability/src/**`
  - Dockerfile: `services/observability/Dockerfile`
  - Purpose: Admin node/zone health view and observability endpoints.

## Supporting Infra

- Edge gateway routing: `infra/docker/nginx/edge-gateway.conf`
- Banking zone load balancer: `infra/docker/nginx/banking-lb.conf`
- Cloud composition: `infra/docker/docker-compose.cloud.yml`

## Notes

- Default admin seeding is handled by `services/authentication`.
- Cross-service contracts in place:
  - `authentication-service` exposes internal APIs for token verification and user listing.
  - `banking-service` and `observability-service` validate JWTs via `auth-client` modules
    against `authentication-service` instead of sharing identity modules.
- Service module boundaries are now explicit:
  - Authentication: `health`, `identity`
  - Banking: `health`, `auth-client`, `ledger`, `transfer`
  - Observability: `health`, `auth-client`, `observability`
