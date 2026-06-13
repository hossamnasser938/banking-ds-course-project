import { Inject, Injectable } from "@nestjs/common";
import {
  DATABASE_CLIENT,
  DatabaseClient
} from "../../infrastructure/database/database.providers";

@Injectable()
export class HealthService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async getStatus() {
    const databaseDependency = await this.checkDatabase();
    const status = databaseDependency.status === "HEALTHY" ? "HEALTHY" : "UNHEALTHY";

    return {
      status,
      staleThresholdSeconds: 15,
      checkedAt: new Date().toISOString(),
      dependencies: [databaseDependency]
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
}
