import { Module } from "@nestjs/common";
import { ConfigModule } from "./infrastructure/config/config.module";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { IdentityModule } from "./modules/identity/identity.module";

@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule, IdentityModule]
})
export class AppModule {}
