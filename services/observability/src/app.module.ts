import { Module } from "@nestjs/common";
import { ConfigModule } from "./infrastructure/config/config.module";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthClientModule } from "./modules/auth-client/auth-client.module";
import { ObservabilityModule } from "./modules/observability/observability.module";

@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule, AuthClientModule, ObservabilityModule]
})
export class AppModule {}
