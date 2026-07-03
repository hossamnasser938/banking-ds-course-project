import { Module } from "@nestjs/common";
import { ObservabilityController } from "./api/observability.controller";
import { ObservabilityService } from "./application/observability.service";
import { NodeHealthRepository } from "./infrastructure/node-health.repository";
import { RecoveryLogService } from "./application/recovery-log.service";
import { AuthClientModule } from "../auth-client/auth-client.module";
import { GcpRoutingService } from "./application/gcp-routing.service";

@Module({
  imports: [AuthClientModule],
  controllers: [ObservabilityController],
  providers: [ObservabilityService, NodeHealthRepository, RecoveryLogService, GcpRoutingService],
  exports: [ObservabilityService, RecoveryLogService]
})
export class ObservabilityModule {}
