export type RecoverySyncStatus = "PENDING" | "SYNCED" | "FAILED";

export class RecoveryLogEntity {
  constructor(
    public readonly logId: string,
    public readonly eventType: string,
    public readonly sourceNodeId: string,
    public readonly zone: string,
    public readonly payload: Record<string, unknown>,
    public syncStatus: RecoverySyncStatus = "PENDING"
  ) {}
}
