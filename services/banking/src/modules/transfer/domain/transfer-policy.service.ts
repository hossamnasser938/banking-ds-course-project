import { Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class TransferPolicyService {
  validate(destinationAccountId: string, amount: number): void {
    if (!destinationAccountId) {
      throw new BadRequestException("Invalid destination account");
    }
    if (amount <= 0) {
      throw new BadRequestException("Amount must be positive");
    }
  }
}
