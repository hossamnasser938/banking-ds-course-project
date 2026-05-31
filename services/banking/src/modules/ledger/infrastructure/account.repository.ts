import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as crypto from "node:crypto";

type Account = { accountId: string; balance: number };

@Injectable()
export class AccountRepository {
  private readonly accountByUser = new Map<string, Account>();
  private readonly userIdByAccountId = new Map<string, string>();

  ensureAccountForUser(userId: string): Account {
    const existing = this.accountByUser.get(userId);
    if (existing) {
      return existing;
    }
    const account = { accountId: crypto.randomUUID(), balance: 100 };
    this.accountByUser.set(userId, account);
    this.userIdByAccountId.set(account.accountId, userId);
    return account;
  }

  transferBetweenAccounts(sourceUserId: string, destinationAccountId: string, amount: number): void {
    const sourceAccount = this.ensureAccountForUser(sourceUserId);

    const destinationUserId = this.userIdByAccountId.get(destinationAccountId);
    if (!destinationUserId) {
      throw new NotFoundException("Destination account not found");
    }
    if (destinationUserId === sourceUserId) {
      throw new BadRequestException("Cannot transfer to the same account");
    }

    const destinationAccount = this.accountByUser.get(destinationUserId);
    if (!destinationAccount) {
      throw new NotFoundException("Destination account not found");
    }
    if (sourceAccount.balance < amount) {
      throw new BadRequestException("Insufficient balance");
    }

    sourceAccount.balance -= amount;
    destinationAccount.balance += amount;
  }
}
