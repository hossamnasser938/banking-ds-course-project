import { Module } from "@nestjs/common";
import { ConfigModule } from "./infrastructure/config/config.module";
import { HealthModule } from "./modules/health/health.module";
import { IdentityModule } from "./modules/identity/identity.module";

@Module({
  imports: [ConfigModule, HealthModule, IdentityModule]
})
export class AppModule {}
