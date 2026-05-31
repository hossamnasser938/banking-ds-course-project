# Banking Service

Standalone banking service boundary.

## Responsibilities

- Balance query APIs
- Money transfer APIs
- Idempotent transfer handling

## Runtime

- Entrypoint: `services/banking/dist/main.js`
- Port: `8080`

## Deployment

Build image with:

```bash
docker build -f services/banking/Dockerfile .
```
