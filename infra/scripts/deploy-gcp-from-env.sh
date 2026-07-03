#!/usr/bin/env bash
set -euo pipefail

BASE_ENV_FILE="${1:-infra/env.gcp.base}"
REGION_ENV_FILE="${2:-infra/env.gcp.region}"

if [[ ! -f "${BASE_ENV_FILE}" ]]; then
  echo "[deploy-gcp-from-env] Missing base env file: ${BASE_ENV_FILE}" >&2
  echo "[deploy-gcp-from-env] Create it from template: infra/env.gcp.base.example" >&2
  exit 1
fi

if [[ ! -f "${REGION_ENV_FILE}" ]]; then
  echo "[deploy-gcp-from-env] Missing region env file: ${REGION_ENV_FILE}" >&2
  echo "[deploy-gcp-from-env] Create it from template: infra/env.gcp.us-central1.example" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${BASE_ENV_FILE}"
# shellcheck disable=SC1090
source "${REGION_ENV_FILE}"

required_vars=(
  PROJECT_ID
  REGION
  DB_PORT
  DB_USER
  DB_PASSWORD
  DB_NAME
  AUTH_INTERNAL_API_KEY
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "[deploy-gcp-from-env] Missing required variable (${var_name}) in layered env files" >&2
    exit 1
  fi
done

if [[ -z "${DB_HOST:-}" && -z "${DB_SOCKET_PATH:-}" ]]; then
  echo "[deploy-gcp-from-env] Set either DB_HOST or DB_SOCKET_PATH in ${BASE_ENV_FILE}/${REGION_ENV_FILE}" >&2
  exit 1
fi

echo "[deploy-gcp-from-env] Using base env file:   ${BASE_ENV_FILE}"
echo "[deploy-gcp-from-env] Using region env file: ${REGION_ENV_FILE}"
echo "[deploy-gcp-from-env] Project: ${PROJECT_ID}"
echo "[deploy-gcp-from-env] Region: ${REGION}"

bash infra/scripts/deploy-gcp.sh
