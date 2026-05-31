export type IdempotencyOutcome = "IN_PROGRESS" | "COMMITTED" | "REJECTED";

export class IdempotencyRecordEntity {
  constructor(
    public readonly idempotencyKey: string,
    public readonly requestHash: string,
    public readonly transferId: string,
    public outcomeStatus: IdempotencyOutcome,
    public responseSnapshot: Record<string, unknown>
  ) {}
}
