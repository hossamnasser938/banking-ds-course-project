import http from "k6/http";
import { check } from "k6";

export default function () {
  const res = http.get("http://localhost:8080/accounts/me/balance");
  check(res, {
    "balance endpoint remains available": (r) => r.status < 500
  });
}
