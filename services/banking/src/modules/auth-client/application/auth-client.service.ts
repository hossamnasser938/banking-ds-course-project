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

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    const response = await fetch(`${this.authServiceUrl}/auth/internal/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new UnauthorizedException("Invalid token");
    }

    return (await response.json()) as AuthenticatedUser;
  }

  async listUsers(): Promise<AuthenticatedUser[]> {
    const response = await fetch(`${this.authServiceUrl}/auth/internal/users`, {
      method: "GET"
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { users?: AuthenticatedUser[] };
    return payload.users ?? [];
  }
}
