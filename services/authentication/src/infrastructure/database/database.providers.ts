import { Provider } from "@nestjs/common";
import { Pool, PoolConfig, QueryResult } from "pg";

export const DATABASE_CLIENT = "DATABASE_CLIENT";

export type DatabaseClient = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL CHECK (char_length(trim(username)) > 0),
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'users_username_non_empty'
     ) THEN
       ALTER TABLE users
       ADD CONSTRAINT users_username_non_empty CHECK (char_length(trim(username)) > 0);
     END IF;
   END
   $$;`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'users_role_valid'
     ) THEN
       ALTER TABLE users
       ADD CONSTRAINT users_role_valid CHECK (role IN ('user', 'admin'));
     END IF;
   END
   $$;`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);`,
  `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);`
];

async function createDatabaseClient(): Promise<DatabaseClient> {
  const pool = new Pool(createPoolConfig());

  pool.on("error", () => {
    // Prevent process crash when DB connections are terminated during outages.
  });

  for (const statement of schemaStatements) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        ["42P07", "42710", "23505"].includes((error as { code?: string }).code ?? "")
      ) {
        continue;
      }
      // Keep auth service bootable even if DB is temporarily unavailable.
      break;
    }
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

function createPoolConfig(): PoolConfig {
  const socketPath = process.env.DB_SOCKET_PATH;
  const sslEnabled = process.env.DB_SSL === "true";
  const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

  return {
    host: socketPath ?? process.env.DB_HOST ?? "postgres-primary",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    database: process.env.DB_NAME ?? "banking",
    ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : undefined
  };
}
