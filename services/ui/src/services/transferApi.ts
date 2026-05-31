import { apiRequest } from "./apiClient";

export type TransferRecipient = {
  userId: string;
  username: string;
  email: string;
  accountId: string;
};

export function createTransfer(
  token: string,
  idempotencyKey: string,
  payload: { destinationAccountId: string; amount: number; note?: string }
) {
  return apiRequest("/transfers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(payload)
  });
}

export function getTransferRecipients(token: string) {
  return apiRequest<{ recipients: TransferRecipient[] }>("/accounts/recipients", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
