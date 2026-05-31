import { Injectable, ConflictException } from "@nestjs/common";
import { IdempotencyRecordEntity } from "../domain/idempotency-record.entity";

@Injectable()
export class IdempotencyRepository {
  private readonly records = new Map<string, IdempotencyRecordEntity>();

  find(idempotencyKey: string): IdempotencyRecordEntity | undefined {
    return this.records.get(idempotencyKey);
  }

  save(record: IdempotencyRecordEntity): void {
    const existing = this.records.get(record.idempotencyKey);
    if (existing && existing.requestHash !== record.requestHash) {
      throw new ConflictException("Idempotency key reuse with different payload");
    }
    this.records.set(record.idempotencyKey, record);
  }
}
