import { Module } from "@nestjs/common";
import { AuthClientModule } from "../auth-client/auth-client.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [AuthClientModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService]
})
export class HealthModule {}
