# Authentication Service

Standalone authentication service boundary.

## Responsibilities

- User registration and login
- Token issuance and validation
- Ownership of authentication/identity data

## Runtime

- Entrypoint: `services/authentication/dist/main.js`
- Port: `8080`

## Deployment

Build image with:

```bash
docker build -f services/authentication/Dockerfile .
```
