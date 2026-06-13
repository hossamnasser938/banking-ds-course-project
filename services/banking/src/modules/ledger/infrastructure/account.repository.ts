import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as crypto from "node:crypto";
import {
  DATABASE_CLIENT,
  DatabaseClient,
  TransactionClient
} from "../../../infrastructure/database/database.providers";

type Account = { accountId: string; balance: number };

@Injectable()
export class AccountRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async ensureAccountForUser(userId: string): Promise<Account> {
    const existing = await this.findAccountByUserId(userId);
    if (existing !== null) {
      return existing;
    }

    const accountId = crypto.randomUUID();
    await this.db.query(
      `INSERT INTO accounts (account_id, user_id, balance, currency, updated_at)
       VALUES ($1, $2, 100, 'USD', NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [accountId, userId]
    );

    const created = await this.findAccountByUserId(userId);
    if (created === null) {
      throw new NotFoundException("Unable to provision account");
    }
    return created;
  }

  async transferBetweenAccounts(
    sourceUserId: string,
    destinationAccountId: string,
    amount: number
  ): Promise<void> {
    const sourceAccount = await this.ensureAccountForUser(sourceUserId);

    await this.db.transaction(async (client) => {
      const source = await this.findAccountByAccountId(sourceAccount.accountId, client);
      const destination = await this.findAccountByAccountId(destinationAccountId, client);

      if (destination === null) {
        throw new NotFoundException("Destination account not found");
      }
      if (source === null) {
        throw new NotFoundException("Source account not found");
      }
      if (destination.accountId === source.accountId) {
        throw new BadRequestException("Cannot transfer to the same account");
      }
      if (source.balance < amount) {
        throw new BadRequestException("Insufficient balance");
      }

      await client.query(
        `UPDATE accounts
         SET balance = balance - $1, updated_at = NOW()
         WHERE account_id = $2`,
        [amount, source.accountId]
      );
      await client.query(
        `UPDATE accounts
         SET balance = balance + $1, updated_at = NOW()
         WHERE account_id = $2`,
        [amount, destination.accountId]
      );
    });
  }

  private async findAccountByUserId(userId: string): Promise<Account | null> {
    const result = await this.db.query(
      "SELECT account_id, balance FROM accounts WHERE user_id = $1",
      [userId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return {
      accountId: result.rows[0].account_id as string,
      balance: Number(result.rows[0].balance)
    };
  }

  private async findAccountByAccountId(
    accountId: string,
    client: TransactionClient
  ): Promise<Account | null> {
    const result = await client.query(
      "SELECT account_id, balance FROM accounts WHERE account_id = $1 FOR UPDATE",
      [accountId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return {
      accountId: result.rows[0].account_id as string,
      balance: Number(result.rows[0].balance)
    };
  }
}
