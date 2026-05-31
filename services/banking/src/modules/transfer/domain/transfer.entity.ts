export type TransferStatus = "PENDING" | "COMMITTED" | "REJECTED";

export class TransferEntity {
  constructor(
    public readonly transferId: string,
    public readonly idempotencyKey: string,
    public readonly sourceAccountId: string,
    public readonly destinationAccountId: string,
    public readonly amount: number,
    public status: TransferStatus = "PENDING",
    public rejectionReason?: string
  ) {}
}
