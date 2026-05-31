import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "./api/guards/jwt-auth.guard";
import { AuthClientService } from "./application/auth-client.service";

@Module({
  providers: [AuthClientService, JwtAuthGuard],
  exports: [AuthClientService, JwtAuthGuard]
})
export class AuthClientModule {}
