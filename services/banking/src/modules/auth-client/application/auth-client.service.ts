import { Injectable, UnauthorizedException } from "@nestjs/common";

export type AuthenticatedUser = {
  userId: string;
  username: string;
  email: string;
  role: "user" | "admin";
};

@Injectable()
export class AuthClientService {
  private readonly authServiceUrl =
    process.env.AUTH_SERVICE_URL ?? "http://authentication-service:8080";
  private readonly internalApiKey =
    process.env.AUTH_INTERNAL_API_KEY ?? "dev-internal-api-key";
  private readonly timeoutMs = Number(process.env.AUTH_CLIENT_TIMEOUT_MS ?? 1500);
  private readonly maxRetries = Number(process.env.AUTH_CLIENT_MAX_RETRIES ?? 2);
  private readonly retryBackoffMs = Number(process.env.AUTH_CLIENT_RETRY_BACKOFF_MS ?? 200);

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    let response: Response;
    try {
      response = await this.requestWithRetry("/auth/internal/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": this.internalApiKey
        },
        body: JSON.stringify({ token })
      });
    } catch {
      throw new UnauthorizedException("Auth service unavailable");
    }

    if (!response.ok) {
      throw new UnauthorizedException("Invalid token");
    }

    return (await response.json()) as AuthenticatedUser;
  }

  async listUsers(): Promise<AuthenticatedUser[]> {
    let response: Response;
    try {
      response = await this.requestWithRetry("/auth/internal/users", {
        method: "GET",
        headers: {
          "x-internal-api-key": this.internalApiKey
        }
      });
    } catch {
      return [];
    }
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { users?: AuthenticatedUser[] };
    return payload.users ?? [];
  }

  async getUserById(userId: string): Promise<AuthenticatedUser | undefined> {
    let response: Response;
    try {
      response = await this.requestWithRetry(`/auth/internal/users/${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: {
          "x-internal-api-key": this.internalApiKey
        }
      });
    } catch {
      return undefined;
    }
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      return undefined;
    }
    return (await response.json()) as AuthenticatedUser;
  }

  async pingHealth(): Promise<boolean> {
    try {
      const response = await this.requestWithRetry("/health", {
        method: "GET"
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async requestWithRetry(path: string, init: RequestInit): Promise<Response> {
    let lastError: unknown;
    const url = `${this.authServiceUrl}${path}`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal
        });

        if (!this.shouldRetryStatus(response.status) || attempt === this.maxRetries) {
          return response;
        }
      } catch (error) {
        lastError = error;
        if (attempt === this.maxRetries) {
          throw error;
        }
      } finally {
        clearTimeout(timeoutId);
      }

      await this.delay(this.retryBackoffMs * (attempt + 1));
    }

    throw lastError instanceof Error ? lastError : new Error("Auth client request failed");
  }

  private shouldRetryStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
