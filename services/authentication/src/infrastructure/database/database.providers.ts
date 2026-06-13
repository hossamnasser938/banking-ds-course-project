import { Provider } from "@nestjs/common";
import { Pool, QueryResult } from "pg";

export const DATABASE_CLIENT = "DATABASE_CLIENT";

export type DatabaseClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
    await pool.query(statement);
  }

  return {
    query(sql: string, params?: unknown[]) {
      return pool.query(sql, params);
    }
  };
}

export const databaseProviders: Provider[] = [
  {
    provide: DATABASE_CLIENT,
    useFactory: createDatabaseClient
  }
];
