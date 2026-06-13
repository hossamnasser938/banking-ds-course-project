import { Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class TransferPolicyService {
  validate(destinationUserId: string, amount: number): void {
    if (!destinationUserId) {
      throw new BadRequestException("Invalid destination user");
    }
    if (amount <= 0) {
      throw new BadRequestException("Amount must be positive");
    }
  }
}
