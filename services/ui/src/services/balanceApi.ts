import { apiRequest } from "./apiClient";

export type BalanceResponse = {
  accountId: string;
  balance: number;
  currency: string;
  metadata?: { nodeId: string; zone: string; timestamp: string };
};

export function getBalance(token: string) {
  return apiRequest<BalanceResponse>("/accounts/me/balance", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
