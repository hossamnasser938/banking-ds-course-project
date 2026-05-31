import { apiRequest } from "./apiClient";

export function getNodeHealth(token: string) {
  return apiRequest("/admin/nodes/health", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
