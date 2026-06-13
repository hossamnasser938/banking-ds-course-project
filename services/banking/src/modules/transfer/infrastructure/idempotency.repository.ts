import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { IdempotencyRecordEntity } from "../domain/idempotency-record.entity";
import { DATABASE_CLIENT, DatabaseClient } from "../../../infrastructure/database/database.providers";

@Injectable()
export class IdempotencyRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async find(idempotencyKey: string): Promise<IdempotencyRecordEntity | undefined> {
    const result = await this.db.query(
      `SELECT idempotency_key, request_hash, transfer_id, outcome_status, response_snapshot
       FROM idempotency_records
       WHERE idempotency_key = $1`,
      [idempotencyKey]
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    return new IdempotencyRecordEntity(
      result.rows[0].idempotency_key as string,
      result.rows[0].request_hash as string,
      result.rows[0].transfer_id as string,
      result.rows[0].outcome_status as "IN_PROGRESS" | "COMMITTED" | "REJECTED",
      result.rows[0].response_snapshot as Record<string, unknown>
    );
  }

  async save(record: IdempotencyRecordEntity): Promise<void> {
    const inserted = await this.db.query(
      `INSERT INTO idempotency_records (
         idempotency_key,
         request_hash,
         transfer_id,
         outcome_status,
         response_snapshot,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        record.idempotencyKey,
        record.requestHash,
        record.transferId,
        record.outcomeStatus,
        JSON.stringify(record.responseSnapshot)
      ]
    );

    if (inserted.rowCount === 1) {
      return;
    }

    const existing = await this.find(record.idempotencyKey);
    if (existing && existing.requestHash !== record.requestHash) {
      throw new ConflictException("Idempotency key reuse with different payload");
    }
  }
}
