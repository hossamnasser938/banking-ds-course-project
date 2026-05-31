import { Provider } from "@nestjs/common";

export const DATABASE_CLIENT = "DATABASE_CLIENT";

export type DatabaseClient = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

const inMemoryDatabaseClient: DatabaseClient = {
  async query() {
    return [];
  }
};

export const databaseProviders: Provider[] = [
  {
    provide: DATABASE_CLIENT,
    useValue: inMemoryDatabaseClient
  }
];
