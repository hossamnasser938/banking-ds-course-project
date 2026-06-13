import { Injectable, NotFoundException } from "@nestjs/common";
import * as crypto from "node:crypto";
import { IdempotencyRecordEntity } from "../domain/idempotency-record.entity";
import { IdempotencyRepository } from "../infrastructure/idempotency.repository";
import { TransferPolicyService } from "../domain/transfer-policy.service";
import { TransferRepository } from "../infrastructure/transfer.repository";
import { AccountRepository } from "../../ledger/infrastructure/account.repository";

@Injectable()
export class TransferService {
  constructor(
    private readonly transferRepository: TransferRepository,
    private readonly idempotencyRepository: IdempotencyRepository,
    private readonly transferPolicyService: TransferPolicyService,
    private readonly accountRepository: AccountRepository
  ) {}

  createTransfer(
    idempotencyKey: string,
    sourceUserId: string,
    destinationAccountId: string,
    amount: number
  ): Promise<Record<string, unknown>> {
    return this.createTransferInternal(
      idempotencyKey,
      sourceUserId,
      destinationAccountId,
      amount
    );
  }

  private async createTransferInternal(
    idempotencyKey: string,
    sourceUserId: string,
    destinationAccountId: string,
    amount: number
  ): Promise<Record<string, unknown>> {
    const sourceAccount = await this.accountRepository.ensureAccountForUser(sourceUserId);
    const payloadHash = this.hashPayload({
      sourceAccountId: sourceAccount.accountId,
      destinationAccountId,
      amount
    });

    const existing = await this.idempotencyRepository.find(idempotencyKey);
    if (existing) {
      return existing.responseSnapshot;
    }

    this.transferPolicyService.validate(destinationAccountId, amount);
    await this.accountRepository.transferBetweenAccounts(
      sourceUserId,
      destinationAccountId,
      amount
    );
    const transfer = await this.transferRepository.create({
      idempotencyKey,
      sourceAccountId: sourceAccount.accountId,
      destinationAccountId,
      amount
    });

    transfer.status = "COMMITTED";
    const response = {
      transferId: transfer.transferId,
      status: transfer.status,
      sourceAccountId: sourceAccount.accountId,
      destinationAccountId,
      amount,
      message: "Transfer committed"
    };

    await this.idempotencyRepository.save(
      new IdempotencyRecordEntity(
        idempotencyKey,
        payloadHash,
        transfer.transferId,
        "COMMITTED",
        response
      )
    );
    return response;
  }

  private hashPayload(payload: Record<string, unknown>): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
  }
}
