#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-infra/docker/docker-compose.local-ha.yml}"
BASE_URL="${BASE_URL:-http://localhost:8080}"
SAMPLE_COUNT="${SAMPLE_COUNT:-20}"
FAILOVER_COUNT="${FAILOVER_COUNT:-10}"
TMP_DIR="${TMPDIR:-/tmp}/banking-lb-validation"

mkdir -p "$TMP_DIR"
BEFORE_FILE="$TMP_DIR/before-failover.jsonl"
AFTER_FILE="$TMP_DIR/after-failover.jsonl"
rm -f "$BEFORE_FILE" "$AFTER_FILE"

echo "==> Preparing test user and token"
SUFFIX="$(date +%s)"
REGISTER_PAYLOAD="{\"username\":\"lbtest${SUFFIX}\",\"email\":\"lbtest${SUFFIX}@example.com\",\"password\":\"pass12345\"}"
REGISTER_RESPONSE="$(curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "$REGISTER_PAYLOAD")"
TOKEN="$(python3 -c 'import json,sys;print(json.loads(sys.stdin.read())["accessToken"])' <<<"$REGISTER_RESPONSE")"

collect_balance_samples() {
  local count="$1"
  local target_file="$2"
  for _ in $(seq 1 "$count"); do
    curl -s "$BASE_URL/accounts/me/balance" \
      -H "Authorization: Bearer $TOKEN" >>"$target_file"
    printf "\n" >>"$target_file"
  done
}

summarize_distribution() {
  local source_file="$1"
  python3 -c '
import json, sys
from collections import Counter
lines=[ln for ln in open(sys.argv[1]).read().splitlines() if ln.strip()]
counter=Counter()
errors=0
for ln in lines:
    try:
        payload=json.loads(ln)
        node=payload.get("metadata", {}).get("nodeId", "missing-node")
        counter[node]+=1
    except Exception:
        errors+=1
print("samples:", len(lines))
for node, count in sorted(counter.items()):
    print(f"{node}: {count}")
if errors:
    print("malformed_responses:", errors)
' "$source_file"
}

echo "==> Capturing distribution before failover (${SAMPLE_COUNT} requests)"
collect_balance_samples "$SAMPLE_COUNT" "$BEFORE_FILE"
summarize_distribution "$BEFORE_FILE"

echo "==> Stopping banking-service-a"
docker compose -f "$COMPOSE_FILE" stop banking-service-a >/dev/null
sleep 3

echo "==> Capturing distribution during failover (${FAILOVER_COUNT} requests)"
collect_balance_samples "$FAILOVER_COUNT" "$AFTER_FILE"
summarize_distribution "$AFTER_FILE"

echo "==> Restarting banking-service-a"
docker compose -f "$COMPOSE_FILE" up -d banking-service-a >/dev/null

echo "==> Failover validation check"
python3 -c '
import json, sys
lines=[ln for ln in open(sys.argv[1]).read().splitlines() if ln.strip()]
bad=[]
for ln in lines:
    payload=json.loads(ln)
    node=payload.get("metadata", {}).get("nodeId", "")
    if "banking-service-local-a" in node:
        bad.append(node)
if bad:
    print("FAIL: traffic still routed to stopped replica")
    sys.exit(1)
print("PASS: no traffic routed to stopped replica")
' "$AFTER_FILE"

echo "Validation artifacts:"
echo "  before failover: $BEFORE_FILE"
echo "  after failover:  $AFTER_FILE"
