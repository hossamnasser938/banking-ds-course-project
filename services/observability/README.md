# Observability Service

Standalone observability service boundary.

## Responsibilities

- Admin observability endpoints
- Node/zone health views
- Recovery and telemetry APIs

## Runtime

- Entrypoint: `services/observability/dist/main.js`
- Port: `8080`

## Deployment

Build image with:

```bash
docker build -f services/observability/Dockerfile .
```
