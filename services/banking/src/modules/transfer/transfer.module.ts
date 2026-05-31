import { Module } from "@nestjs/common";
import { TransferController } from "./api/transfer.controller";
import { TransferService } from "./application/transfer.service";
import { TransferRepository } from "./infrastructure/transfer.repository";
import { IdempotencyRepository } from "./infrastructure/idempotency.repository";
import { TransferPolicyService } from "./domain/transfer-policy.service";
import { AuthClientModule } from "../auth-client/auth-client.module";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [AuthClientModule, LedgerModule],
  controllers: [TransferController],
  providers: [
    TransferService,
    TransferRepository,
    IdempotencyRepository,
    TransferPolicyService
  ]
})
export class TransferModule {}
