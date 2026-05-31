import { Module } from "@nestjs/common";
import { AuthController } from "./api/auth.controller";
import { AuthService } from "./application/auth.service";
import { IdentityRepository } from "./infrastructure/identity.repository";

@Module({
  controllers: [AuthController],
  providers: [AuthService, IdentityRepository],
  exports: [AuthService, IdentityRepository]
})
export class IdentityModule {}
