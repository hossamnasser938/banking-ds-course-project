import { apiRequest } from "./apiClient";

export function getNodeHealth(token: string) {
  return apiRequest("/admin/nodes/health", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getRoutingStatus(token: string) {
  return apiRequest<{
    provider: "gcp";
    bankingAEnabled: boolean;
    bankingBEnabled: boolean;
    bankingAWeight: number;
    bankingBWeight: number;
    urlMapName: string;
  }>("/admin/nodes/routing", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function setRoutingStatus(
  token: string,
  input: { bankingAEnabled: boolean; bankingBEnabled: boolean }
) {
  return apiRequest<{
    provider: "gcp";
    bankingAEnabled: boolean;
    bankingBEnabled: boolean;
    bankingAWeight: number;
    bankingBWeight: number;
    urlMapName: string;
  }>("/admin/nodes/routing", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });
}
