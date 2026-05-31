import { Injectable } from "@nestjs/common";
import * as crypto from "node:crypto";
import { TransferEntity } from "../domain/transfer.entity";

@Injectable()
export class TransferRepository {
  private readonly transfers = new Map<string, TransferEntity>();

  create(data: {
    idempotencyKey: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
  }): TransferEntity {
    const transfer = new TransferEntity(
      crypto.randomUUID(),
      data.idempotencyKey,
      data.sourceAccountId,
      data.destinationAccountId,
      data.amount
    );
    this.transfers.set(transfer.transferId, transfer);
    return transfer;
  }
}
