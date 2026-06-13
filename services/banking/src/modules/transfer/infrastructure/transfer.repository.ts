import { Inject, Injectable } from "@nestjs/common";
import * as crypto from "node:crypto";
import { TransferEntity } from "../domain/transfer.entity";
import { DATABASE_CLIENT, DatabaseClient } from "../../../infrastructure/database/database.providers";

@Injectable()
export class TransferRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async create(data: {
    idempotencyKey: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
  }): Promise<TransferEntity> {
    const transfer = new TransferEntity(
      crypto.randomUUID(),
      data.idempotencyKey,
      data.sourceAccountId,
      data.destinationAccountId,
      data.amount
    );
    transfer.status = "COMMITTED";
    await this.db.query(
      `INSERT INTO transfers (
         transfer_id,
         idempotency_key,
         source_account_id,
         destination_account_id,
         amount,
         status,
         committed_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        transfer.transferId,
        transfer.idempotencyKey,
        transfer.sourceAccountId,
        transfer.destinationAccountId,
        transfer.amount,
        transfer.status
      ]
    );
    return transfer;
  }
}
