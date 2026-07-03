#!/usr/bin/env bash
set -euo pipefail

UI_BASE_URL="${UI_BASE_URL:-https://banking-ui-178146002563.us-central1.run.app}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@gmail.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-P@ssw0rd}"
REQUESTS_PER_CASE="${REQUESTS_PER_CASE:-20}"
PROPAGATION_WAIT_SECONDS="${PROPAGATION_WAIT_SECONDS:-100}"
export UI_BASE_URL ADMIN_EMAIL ADMIN_PASSWORD REQUESTS_PER_CASE PROPAGATION_WAIT_SECONDS

python3 - <<'PY'
import json
import os
import time
import urllib.error
import urllib.request
import uuid

BASE = os.environ["UI_BASE_URL"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
REQUESTS_PER_CASE = int(os.environ["REQUESTS_PER_CASE"])
PROPAGATION_WAIT_SECONDS = int(os.environ["PROPAGATION_WAIT_SECONDS"])


def req(method, path, payload=None, token=None, timeout=30):
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode()
    request = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode()
            parsed = json.loads(body) if body else {}
            return response.status, parsed
    except urllib.error.HTTPError as err:
        body = err.read().decode()
        try:
            parsed = json.loads(body) if body else {}
        except Exception:
            parsed = {"raw": body}
        return err.code, parsed
    except Exception as err:
        return 0, {"error": str(err)}


def run_transfers(sender_token, destination_user_id, count, label):
    result = {
        "label": label,
        "total": count,
        "ok": 0,
        "fail": 0,
        "node_counts": {},
        "samples": []
    }
    for i in range(count):
        payload = {
            "destinationUserId": destination_user_id,
            "amount": 1,
            "note": f"{label}-{i}"
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {sender_token}",
            "Idempotency-Key": str(uuid.uuid4())
        }
        request = urllib.request.Request(
            f"{BASE}/transfers",
            data=json.dumps(payload).encode(),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode()
                parsed = json.loads(body) if body else {}
                node_id = ((parsed.get("metadata") or {}).get("nodeId")) or "unknown"
                result["ok"] += 1
                result["node_counts"][node_id] = result["node_counts"].get(node_id, 0) + 1
                if len(result["samples"]) < 3:
                    result["samples"].append(
                        {"status": response.status, "nodeId": node_id, "metadata": parsed.get("metadata")}
                    )
        except urllib.error.HTTPError as err:
            body = err.read().decode()
            try:
                parsed = json.loads(body) if body else {}
            except Exception:
                parsed = {"raw": body}
            result["fail"] += 1
            if len(result["samples"]) < 3:
                result["samples"].append({"status": err.code, "error": parsed})
        except Exception as err:
            result["fail"] += 1
            if len(result["samples"]) < 3:
                result["samples"].append({"status": 0, "error": str(err)})
    return result


def wait_for_routing(admin_token, a_enabled, b_enabled):
    for _ in range(20):
        req(
            "POST",
            "/admin/nodes/routing",
            {"bankingAEnabled": a_enabled, "bankingBEnabled": b_enabled},
            admin_token
        )
        status, payload = req("GET", "/admin/nodes/routing", token=admin_token)
        if (
            status == 200
            and payload.get("bankingAEnabled") == a_enabled
            and payload.get("bankingBEnabled") == b_enabled
        ):
            return True
        time.sleep(2)
    return False


report = {"config": {"baseUrl": BASE, "requestsPerCase": REQUESTS_PER_CASE}}
status, admin_login = req("POST", "/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
if status not in (200, 201):
    report["fatal"] = {"step": "admin_login", "status": status, "response": admin_login}
    print(json.dumps(report, indent=2))
    raise SystemExit(1)

admin_token = admin_login["accessToken"]
suffix = uuid.uuid4().hex[:8]
status, sender = req(
    "POST",
    "/auth/register",
    {"username": f"rt_sender_{suffix}", "email": f"rt_sender_{suffix}@example.com", "password": "P@ssw0rd!"}
)
status2, recipient = req(
    "POST",
    "/auth/register",
    {"username": f"rt_recipient_{suffix}", "email": f"rt_recipient_{suffix}@example.com", "password": "P@ssw0rd!"}
)
if status not in (200, 201) or status2 not in (200, 201):
    report["fatal"] = {"step": "register_users", "senderStatus": status, "recipientStatus": status2}
    print(json.dumps(report, indent=2))
    raise SystemExit(1)

sender_token = sender["accessToken"]
recipient_user_id = recipient["userId"]

wait_for_routing(admin_token, True, False)
time.sleep(PROPAGATION_WAIT_SECONDS)
report["case_a_only"] = run_transfers(sender_token, recipient_user_id, REQUESTS_PER_CASE, "a-only")

wait_for_routing(admin_token, False, True)
time.sleep(PROPAGATION_WAIT_SECONDS)
report["case_b_only"] = run_transfers(sender_token, recipient_user_id, REQUESTS_PER_CASE, "b-only")

wait_for_routing(admin_token, True, True)
time.sleep(PROPAGATION_WAIT_SECONDS)
report["case_both_enabled"] = run_transfers(
    sender_token, recipient_user_id, REQUESTS_PER_CASE, "both-enabled"
)

print(json.dumps(report, indent=2))
PY
