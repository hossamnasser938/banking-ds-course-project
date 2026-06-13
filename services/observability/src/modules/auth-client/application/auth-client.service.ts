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

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    const response = await fetch(`${this.authServiceUrl}/auth/internal/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": this.internalApiKey
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new UnauthorizedException("Invalid token");
    }

    return (await response.json()) as AuthenticatedUser;
  }
}
