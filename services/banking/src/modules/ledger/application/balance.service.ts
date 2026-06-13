import { Injectable } from "@nestjs/common";
import { AuthClientService } from "../../auth-client/application/auth-client.service";
import { AccountRepository } from "../infrastructure/account.repository";

@Injectable()
export class BalanceService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly authClientService: AuthClientService
  ) {}

  async getBalanceByUserId(userId: string) {
    const account = await this.accountRepository.ensureAccountForUser(userId);
    return {
      accountId: account.accountId,
      balance: account.balance,
      currency: "USD"
    };
  }

  async listRecipients(userId: string) {
    const users = await this.authClientService.listUsers();
    const recipients = users
      .filter((user) => user.role !== "admin" && user.userId !== userId)
      .map((user) => ({
        userId: user.userId,
        username: user.username,
        email: user.email
      }));

    return {
      recipients
    };
  }
}
