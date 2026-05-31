import { Module } from "@nestjs/common";
import { BalanceController } from "./api/balance.controller";
import { BalanceService } from "./application/balance.service";
import { AuthClientModule } from "../auth-client/auth-client.module";
import { AccountRepository } from "./infrastructure/account.repository";

@Module({
  imports: [AuthClientModule],
  controllers: [BalanceController],
  providers: [BalanceService, AccountRepository],
  exports: [BalanceService, AccountRepository]
})
export class LedgerModule {}
