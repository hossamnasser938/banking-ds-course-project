#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-}"
DELTA="${2:-+1}"

if [[ -z "$SERVICE_NAME" ]]; then
  echo "Usage: $0 <service-name> <+N|-N>"
  exit 1
fi

echo "[scale-node] Scaling ${SERVICE_NAME} by ${DELTA}"
echo "[scale-node] TODO: Integrate with docker compose or cloud autoscaling command."
