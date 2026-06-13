import { Provider } from "@nestjs/common";
import { Pool, PoolClient, QueryResult } from "pg";

export const DATABASE_CLIENT = "DATABASE_CLIENT";

export type DatabaseClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  transaction: <T>(run: (client: TransactionClient) => Promise<T>) => Promise<T>;
};

export type TransactionClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS accounts (
    account_id UUID PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 100 CHECK (balance >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS transfers (
    transfer_id UUID PRIMARY KEY,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    source_account_id UUID NOT NULL,
    destination_account_id UUID NOT NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(32) NOT NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    committed_at TIMESTAMP NULL,
    CHECK (source_account_id <> destination_account_id)
  );`,
  `CREATE TABLE IF NOT EXISTS idempotency_records (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    request_hash TEXT NOT NULL,
    transfer_id UUID NOT NULL,
    outcome_status VARCHAR(32) NOT NULL CHECK (outcome_status IN ('IN_PROGRESS', 'COMMITTED', 'REJECTED')),
    response_snapshot JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'accounts_balance_non_negative'
     ) THEN
       ALTER TABLE accounts
       ADD CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0);
     END IF;
   END
   $$;`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'transfers_amount_positive'
     ) THEN
       ALTER TABLE transfers
       ADD CONSTRAINT transfers_amount_positive CHECK (amount > 0);
     END IF;
   END
   $$;`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'transfers_accounts_must_differ'
     ) THEN
       ALTER TABLE transfers
       ADD CONSTRAINT transfers_accounts_must_differ CHECK (source_account_id <> destination_account_id);
     END IF;
   END
   $$;`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'idempotency_outcome_status_valid'
     ) THEN
       ALTER TABLE idempotency_records
       ADD CONSTRAINT idempotency_outcome_status_valid CHECK (
         outcome_status IN ('IN_PROGRESS', 'COMMITTED', 'REJECTED')
       );
     END IF;
   END
   $$;`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_updated_at ON accounts (updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_transfers_source_created_at ON transfers (source_account_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_transfers_destination_created_at ON transfers (destination_account_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers (created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_idempotency_outcome_status ON idempotency_records (outcome_status);`,
  `CREATE INDEX IF NOT EXISTS idx_idempotency_transfer_id ON idempotency_records (transfer_id);`
];

async function createDatabaseClient(): Promise<DatabaseClient> {
  const pool = new Pool({
    host: process.env.DB_HOST ?? "postgres-primary",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    database: process.env.DB_NAME ?? "banking"
  });

  pool.on("error", () => {
    // Prevent process termination when DB resets active pooled connections.
  });

  for (const statement of schemaStatements) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        ["23505", "42P07", "42710"].includes((error as { code?: string }).code ?? "")
      ) {
        // Another replica may race to create the same schema object.
        continue;
      }
      throw error;
    }
  }

  return {
    query(sql: string, params?: unknown[]) {
      return pool.query(sql, params);
    },
    async transaction<T>(run: (client: TransactionClient) => Promise<T>): Promise<T> {
      const client: PoolClient = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await run({
          query(sql: string, params?: unknown[]) {
            return client.query(sql, params);
          }
        });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

export const databaseProviders: Provider[] = [
  {
    provide: DATABASE_CLIENT,
    useFactory: createDatabaseClient
  }
];
