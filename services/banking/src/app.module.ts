import { Module } from "@nestjs/common";
import { ConfigModule } from "./infrastructure/config/config.module";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthClientModule } from "./modules/auth-client/auth-client.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { TransferModule } from "./modules/transfer/transfer.module";

@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule, AuthClientModule, LedgerModule, TransferModule]
})
export class AppModule {}
