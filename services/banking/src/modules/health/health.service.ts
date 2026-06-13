import { Inject, Injectable } from "@nestjs/common";
import { AuthClientService } from "../auth-client/application/auth-client.service";
import {
  DATABASE_CLIENT,
  DatabaseClient
} from "../../infrastructure/database/database.providers";

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    private readonly authClientService: AuthClientService
  ) {}

  async getStatus() {
    const dependencies = await Promise.all([this.checkDatabase(), this.checkAuthenticationService()]);
    const hasFailure = dependencies.some((dependency) => dependency.status === "UNHEALTHY");

    return {
      status: hasFailure ? "UNHEALTHY" : "HEALTHY",
      staleThresholdSeconds: 15,
      checkedAt: new Date().toISOString(),
      dependencies
    };
  }

  private async checkDatabase(): Promise<{
    dependency: string;
    status: "HEALTHY" | "UNHEALTHY";
    details?: string;
  }> {
    try {
      await this.db.query("SELECT 1");
      return { dependency: "postgres", status: "HEALTHY" };
    } catch {
      return {
        dependency: "postgres",
        status: "UNHEALTHY",
        details: "Database ping failed"
      };
    }
  }

  private async checkAuthenticationService(): Promise<{
    dependency: string;
    status: "HEALTHY" | "UNHEALTHY";
    details?: string;
  }> {
    const reachable = await this.authClientService.pingHealth();
    if (!reachable) {
      return {
        dependency: "authentication-service",
        status: "UNHEALTHY",
        details: "Auth service health endpoint unreachable"
      };
    }
    return { dependency: "authentication-service", status: "HEALTHY" };
  }
}
