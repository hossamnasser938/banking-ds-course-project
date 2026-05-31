import { Injectable } from "@nestjs/common";

@Injectable()
export class RecoveryLogService {
  private readonly entries: string[] = [];

  logTransferCommit(transferId: string) {
    this.entries.push(`TRANSFER_COMMITTED:${transferId}`);
  }
}
