import { apiRequest } from "./apiClient";

export type AuthResponse = {
  accessToken: string;
  userId: string;
  username: string;
  role: "user" | "admin";
  metadata?: { nodeId: string; zone: string; timestamp: string };
};

export function register(payload: {
  username: string;
  email: string;
  password: string;
  role?: "user" | "admin";
}) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
