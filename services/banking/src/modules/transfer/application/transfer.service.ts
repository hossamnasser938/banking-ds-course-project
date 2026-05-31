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
  ) {
    const sourceAccount = this.accountRepository.ensureAccountForUser(sourceUserId);

    const payloadHash = this.hashPayload({
      sourceAccountId: sourceAccount.accountId,
      destinationAccountId,
      amount
    });

    const existing = this.idempotencyRepository.find(idempotencyKey);
    if (existing) {
      return existing.responseSnapshot;
    }

    this.transferPolicyService.validate(destinationAccountId, amount);
    this.accountRepository.transferBetweenAccounts(
      sourceUserId,
      destinationAccountId,
      amount
    );
    const transfer = this.transferRepository.create({
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

    this.idempotencyRepository.save(
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
