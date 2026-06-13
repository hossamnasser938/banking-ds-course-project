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
    balance NUMERIC(18, 2) NOT NULL DEFAULT 100,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS transfers (
    transfer_id UUID PRIMARY KEY,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    source_account_id UUID NOT NULL,
    destination_account_id UUID NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    committed_at TIMESTAMP NULL
  );`,
  `CREATE TABLE IF NOT EXISTS idempotency_records (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    request_hash TEXT NOT NULL,
    transfer_id UUID NOT NULL,
    outcome_status VARCHAR(32) NOT NULL,
    response_snapshot JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`
];

async function createDatabaseClient(): Promise<DatabaseClient> {
  const pool = new Pool({
    host: process.env.DB_HOST ?? "postgres-primary",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    database: process.env.DB_NAME ?? "banking"
  });

  for (const statement of schemaStatements) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
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
