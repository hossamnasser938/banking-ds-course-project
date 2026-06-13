import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as crypto from "node:crypto";
import { IdempotencyRecordEntity } from "../domain/idempotency-record.entity";
import { IdempotencyRepository } from "../infrastructure/idempotency.repository";
import { TransferPolicyService } from "../domain/transfer-policy.service";
import { TransferRepository } from "../infrastructure/transfer.repository";
import { AccountRepository } from "../../ledger/infrastructure/account.repository";
import { AuthClientService } from "../../auth-client/application/auth-client.service";

@Injectable()
export class TransferService {
  constructor(
    private readonly transferRepository: TransferRepository,
    private readonly idempotencyRepository: IdempotencyRepository,
    private readonly transferPolicyService: TransferPolicyService,
    private readonly accountRepository: AccountRepository,
    private readonly authClientService: AuthClientService
  ) {}

  createTransfer(
    idempotencyKey: string,
    sourceUserId: string,
    destinationUserId: string,
    amount: number
  ): Promise<Record<string, unknown>> {
    return this.createTransferInternal(
      idempotencyKey,
      sourceUserId,
      destinationUserId,
      amount
    );
  }

  private async createTransferInternal(
    idempotencyKey: string,
    sourceUserId: string,
    destinationUserId: string,
    amount: number
  ): Promise<Record<string, unknown>> {
    const sourceAccount = await this.accountRepository.ensureAccountForUser(sourceUserId);
    const destinationUser = await this.authClientService.getUserById(destinationUserId);
    if (!destinationUser || destinationUser.role !== "user") {
      throw new NotFoundException("Destination user not found");
    }
    if (destinationUser.userId === sourceUserId) {
      throw new BadRequestException("Cannot transfer to the same user");
    }
    const destinationAccount = await this.accountRepository.ensureAccountForUser(destinationUser.userId);

    const payloadHash = this.hashPayload({
      sourceAccountId: sourceAccount.accountId,
      destinationUserId: destinationUser.userId,
      amount
    });

    const existing = await this.idempotencyRepository.find(idempotencyKey);
    if (existing) {
      return existing.responseSnapshot;
    }

    this.transferPolicyService.validate(destinationUser.userId, amount);
    const transferred = await this.accountRepository.transferBetweenAccounts(
      sourceUserId,
      destinationUser.userId,
      amount
    );
    const transfer = await this.transferRepository.create({
      idempotencyKey,
      sourceAccountId: transferred.sourceAccountId,
      destinationAccountId: transferred.destinationAccountId,
      amount
    });

    transfer.status = "COMMITTED";
    const response = {
      transferId: transfer.transferId,
      status: transfer.status,
      sourceAccountId: transferred.sourceAccountId,
      destinationAccountId: transferred.destinationAccountId,
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
