import { Module } from "@nestjs/common";
import { AuthClientModule } from "../auth-client/auth-client.module";
import { ObservabilityModule } from "../observability/observability.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [AuthClientModule, ObservabilityModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService]
})
export class HealthModule {}
