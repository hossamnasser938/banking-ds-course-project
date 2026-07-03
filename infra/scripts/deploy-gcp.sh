#!/usr/bin/env bash
set -euo pipefail

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "[deploy-gcp] Missing required env var: ${name}" >&2
    exit 1
  fi
}

append_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped="${value//\'/\'\'}"
  printf "%s: '%s'\n" "${key}" "${escaped}" >>"${file}"
}

require_var PROJECT_ID

REGION="${REGION:-us-central1}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-gcr.io/${PROJECT_ID}}"
TAG="${TAG:-latest}"

SERVICE_PREFIX="${SERVICE_PREFIX:-banking}"
AUTH_SERVICE_NAME="${AUTH_SERVICE_NAME:-${SERVICE_PREFIX}-auth}"
BANKING_A_SERVICE_NAME="${BANKING_A_SERVICE_NAME:-${SERVICE_PREFIX}-banking-a}"
BANKING_B_SERVICE_NAME="${BANKING_B_SERVICE_NAME:-${SERVICE_PREFIX}-banking-b}"
BANKING_ROUTED_SERVICE_NAME="${BANKING_ROUTED_SERVICE_NAME:-${SERVICE_PREFIX}-banking}"
OBS_SERVICE_NAME="${OBS_SERVICE_NAME:-${SERVICE_PREFIX}-observability}"
UI_SERVICE_NAME="${UI_SERVICE_NAME:-${SERVICE_PREFIX}-ui}"

AUTH_IMAGE="${IMAGE_REGISTRY}/${AUTH_SERVICE_NAME}:${TAG}"
BANKING_IMAGE="${IMAGE_REGISTRY}/${SERVICE_PREFIX}-banking:${TAG}"
OBS_IMAGE="${IMAGE_REGISTRY}/${OBS_SERVICE_NAME}:${TAG}"
UI_IMAGE="${IMAGE_REGISTRY}/${UI_SERVICE_NAME}:${TAG}"

AUTH_INTERNAL_API_KEY="${AUTH_INTERNAL_API_KEY:-cloud-internal-api-key}"

DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-banking}"
DB_SOCKET_PATH="${DB_SOCKET_PATH:-}"
DB_SSL="${DB_SSL:-false}"
DB_SSL_REJECT_UNAUTHORIZED="${DB_SSL_REJECT_UNAUTHORIZED:-true}"
DB_CONNECTION_NAME="${DB_SOCKET_PATH#/cloudsql/}"

CORS_ORIGIN="${CORS_ORIGIN:-}"

build_cloudsql_flags() {
  if [[ -n "${DB_SOCKET_PATH}" ]]; then
    if [[ "${DB_CONNECTION_NAME}" == "${DB_SOCKET_PATH}" || -z "${DB_CONNECTION_NAME}" ]]; then
      echo "[deploy-gcp] DB_SOCKET_PATH must be /cloudsql/<PROJECT:REGION:INSTANCE>" >&2
      exit 1
    fi
    echo "--add-cloudsql-instances ${DB_CONNECTION_NAME}"
  fi
}

echo "[deploy-gcp] Project: ${PROJECT_ID}"
echo "[deploy-gcp] Region:  ${REGION}"
echo "[deploy-gcp] Building and pushing images..."

docker build -f services/authentication/Dockerfile -t "${AUTH_IMAGE}" .
docker push "${AUTH_IMAGE}"

docker build -f services/banking/Dockerfile -t "${BANKING_IMAGE}" .
docker push "${BANKING_IMAGE}"

docker build -f services/observability/Dockerfile -t "${OBS_IMAGE}" .
docker push "${OBS_IMAGE}"

docker build -f services/ui/Dockerfile -t "${UI_IMAGE}" .
docker push "${UI_IMAGE}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

auth_env_file="${tmp_dir}/auth.env.yaml"
banking_a_env_file="${tmp_dir}/banking-a.env.yaml"
banking_b_env_file="${tmp_dir}/banking-b.env.yaml"
obs_env_file="${tmp_dir}/observability.env.yaml"
ui_env_file="${tmp_dir}/ui.env.yaml"

append_db_env() {
  local file="$1"
  append_env "${file}" "DB_PORT" "${DB_PORT}"
  append_env "${file}" "DB_USER" "${DB_USER}"
  append_env "${file}" "DB_PASSWORD" "${DB_PASSWORD}"
  append_env "${file}" "DB_NAME" "${DB_NAME}"
  append_env "${file}" "DB_SSL" "${DB_SSL}"
  append_env "${file}" "DB_SSL_REJECT_UNAUTHORIZED" "${DB_SSL_REJECT_UNAUTHORIZED}"
  if [[ -n "${DB_SOCKET_PATH}" ]]; then
    append_env "${file}" "DB_SOCKET_PATH" "${DB_SOCKET_PATH}"
  else
    require_var DB_HOST
    append_env "${file}" "DB_HOST" "${DB_HOST}"
  fi
}

append_env "${auth_env_file}" "NODE_ID" "authentication-service-1"
append_env "${auth_env_file}" "ZONE" "shared-zone"
append_env "${auth_env_file}" "AUTH_INTERNAL_API_KEY" "${AUTH_INTERNAL_API_KEY}"
append_db_env "${auth_env_file}"
if [[ -n "${CORS_ORIGIN}" ]]; then
  append_env "${auth_env_file}" "CORS_ORIGIN" "${CORS_ORIGIN}"
fi

echo "[deploy-gcp] Deploying authentication service..."
cloudsql_flags="$(build_cloudsql_flags)"
gcloud run deploy "${AUTH_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --image "${AUTH_IMAGE}" \
  ${cloudsql_flags} \
  --env-vars-file "${auth_env_file}"

AUTH_SERVICE_URL="$(
  gcloud run services describe "${AUTH_SERVICE_NAME}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --format='value(status.url)'
)"

append_env "${banking_a_env_file}" "NODE_ID" "banking-api-zone-a-1"
append_env "${banking_a_env_file}" "ZONE" "zone-a"
append_env "${banking_a_env_file}" "AUTH_SERVICE_URL" "${AUTH_SERVICE_URL}"
append_env "${banking_a_env_file}" "AUTH_INTERNAL_API_KEY" "${AUTH_INTERNAL_API_KEY}"
append_env "${banking_a_env_file}" "AUTH_CLIENT_TIMEOUT_MS" "1500"
append_env "${banking_a_env_file}" "AUTH_CLIENT_MAX_RETRIES" "2"
append_env "${banking_a_env_file}" "AUTH_CLIENT_RETRY_BACKOFF_MS" "200"
append_db_env "${banking_a_env_file}"
if [[ -n "${CORS_ORIGIN}" ]]; then
  append_env "${banking_a_env_file}" "CORS_ORIGIN" "${CORS_ORIGIN}"
fi

cp "${banking_a_env_file}" "${banking_b_env_file}"
sed -i.bak "s/banking-api-zone-a-1/banking-api-zone-b-1/" "${banking_b_env_file}" && rm -f "${banking_b_env_file}.bak"
sed -i.bak "s/ZONE: 'zone-a'/ZONE: 'zone-b'/" "${banking_b_env_file}" && rm -f "${banking_b_env_file}.bak"

echo "[deploy-gcp] Deploying banking service replicas..."
gcloud run deploy "${BANKING_A_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --image "${BANKING_IMAGE}" \
  ${cloudsql_flags} \
  --env-vars-file "${banking_a_env_file}"

gcloud run deploy "${BANKING_B_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --image "${BANKING_IMAGE}" \
  ${cloudsql_flags} \
  --env-vars-file "${banking_b_env_file}"

BANKING_A_URL="$(
  gcloud run services describe "${BANKING_A_SERVICE_NAME}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --format='value(status.url)'
)"
BANKING_B_URL="$(
  gcloud run services describe "${BANKING_B_SERVICE_NAME}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --format='value(status.url)'
)"

echo "[deploy-gcp] Deploying unified banking service with revision tags..."
gcloud run deploy "${BANKING_ROUTED_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --image "${BANKING_IMAGE}" \
  ${cloudsql_flags} \
  --env-vars-file "${banking_a_env_file}"

BANKING_REV_A="$(
  gcloud run revisions list \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --service "${BANKING_ROUTED_SERVICE_NAME}" \
    --sort-by='~metadata.creationTimestamp' \
    --limit=1 \
    --format='value(metadata.name)'
)"

gcloud run deploy "${BANKING_ROUTED_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --image "${BANKING_IMAGE}" \
  ${cloudsql_flags} \
  --env-vars-file "${banking_b_env_file}" \
  --no-traffic

BANKING_REV_B="$(
  gcloud run revisions list \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --service "${BANKING_ROUTED_SERVICE_NAME}" \
    --sort-by='~metadata.creationTimestamp' \
    --limit=1 \
    --format='value(metadata.name)'
)"

gcloud run services update-traffic "${BANKING_ROUTED_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --to-revisions "${BANKING_REV_A}=50,${BANKING_REV_B}=50" \
  --set-tags "tag-a=${BANKING_REV_A},tag-b=${BANKING_REV_B}"

BANKING_ROUTED_URL="$(
  gcloud run services describe "${BANKING_ROUTED_SERVICE_NAME}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --format='value(status.url)'
)"

observed_services_json="$(cat <<EOF
[{"serviceName":"${BANKING_A_SERVICE_NAME}","componentType":"banking-api","zone":"zone-a","url":"${BANKING_A_URL}"},{"serviceName":"${BANKING_B_SERVICE_NAME}","componentType":"banking-api","zone":"zone-b","url":"${BANKING_B_URL}"}]
EOF
)"

append_env "${obs_env_file}" "NODE_ID" "observability-service-1"
append_env "${obs_env_file}" "ZONE" "shared-zone"
append_env "${obs_env_file}" "AUTH_SERVICE_URL" "${AUTH_SERVICE_URL}"
append_env "${obs_env_file}" "AUTH_INTERNAL_API_KEY" "${AUTH_INTERNAL_API_KEY}"
append_env "${obs_env_file}" "GCP_PROJECT_ID" "${PROJECT_ID}"
append_env "${obs_env_file}" "GCP_REGION" "${REGION}"
append_env "${obs_env_file}" "BANKING_CLOUD_RUN_SERVICE" "${BANKING_ROUTED_SERVICE_NAME}"
append_env "${obs_env_file}" "BANKING_TRAFFIC_TAG_A" "tag-a"
append_env "${obs_env_file}" "BANKING_TRAFFIC_TAG_B" "tag-b"
append_env "${obs_env_file}" "ROUTING_PROPAGATION_WAIT_MS" "90000"
append_env "${obs_env_file}" "AUTH_CLIENT_TIMEOUT_MS" "1500"
append_env "${obs_env_file}" "AUTH_CLIENT_MAX_RETRIES" "2"
append_env "${obs_env_file}" "AUTH_CLIENT_RETRY_BACKOFF_MS" "200"
append_env "${obs_env_file}" "OBS_NODE_HEALTH_TIMEOUT_MS" "1200"
append_env "${obs_env_file}" "OBS_NODE_HEALTH_MAX_RETRIES" "1"
append_env "${obs_env_file}" "OBS_NODE_HEALTH_RETRY_BACKOFF_MS" "200"
append_env "${obs_env_file}" "OBSERVED_SERVICES_JSON" "${observed_services_json}"
if [[ -n "${CORS_ORIGIN}" ]]; then
  append_env "${obs_env_file}" "CORS_ORIGIN" "${CORS_ORIGIN}"
fi

echo "[deploy-gcp] Deploying observability service..."
gcloud run deploy "${OBS_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --image "${OBS_IMAGE}" \
  ${cloudsql_flags} \
  --env-vars-file "${obs_env_file}"

OBS_URL="$(
  gcloud run services describe "${OBS_SERVICE_NAME}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --format='value(status.url)'
)"

append_env "${ui_env_file}" "AUTH_SERVICE_URL" "${AUTH_SERVICE_URL}"
append_env "${ui_env_file}" "BANKING_SERVICE_URL" "${BANKING_ROUTED_URL}"
append_env "${ui_env_file}" "OBS_SERVICE_URL" "${OBS_URL}"

echo "[deploy-gcp] Deploying UI service..."
gcloud run deploy "${UI_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 80 \
  --image "${UI_IMAGE}" \
  --env-vars-file "${ui_env_file}"

UI_URL="$(
  gcloud run services describe "${UI_SERVICE_NAME}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --format='value(status.url)'
)"

echo
echo "[deploy-gcp] Deployment complete."
echo "  Auth URL:          ${AUTH_SERVICE_URL}"
echo "  Banking A URL:     ${BANKING_A_URL}"
echo "  Banking B URL:     ${BANKING_B_URL}"
echo "  Banking Routed URL:${BANKING_ROUTED_URL}"
echo "  Observability URL: ${OBS_URL}"
echo "  UI URL:            ${UI_URL}"
echo
echo "[deploy-gcp] Next step:"
echo "  Configure GCP HTTP(S) load balancer path routing so UI and API share one host."
