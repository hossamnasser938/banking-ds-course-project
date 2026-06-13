import { Module } from "@nestjs/common";
import { AuthController } from "./api/auth.controller";
import { InternalApiGuard } from "./api/guards/internal-api.guard";
import { AuthService } from "./application/auth.service";
import { IdentityRepository } from "./infrastructure/identity.repository";

@Module({
  controllers: [AuthController],
  providers: [AuthService, IdentityRepository, InternalApiGuard],
  exports: [AuthService, IdentityRepository]
})
export class IdentityModule {}
