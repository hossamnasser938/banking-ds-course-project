import { Inject, Injectable } from "@nestjs/common";
import * as crypto from "node:crypto";
import {
  DATABASE_CLIENT,
  DatabaseClient
} from "../../../infrastructure/database/database.providers";
import { UserEntity, UserRole } from "../domain/user.entity";

@Injectable()
export class IdentityRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async createUser(
    username: string,
    email: string,
    password: string,
    role: UserRole = "user"
  ): Promise<UserEntity> {
    const userId = crypto.randomUUID();
    const createdAt = new Date();
    const passwordHash = `hash:${password}`;

    await this.db.query(
      `INSERT INTO users (user_id, username, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, username, email, passwordHash, role, createdAt]
    );

    return new UserEntity(userId, username, email, passwordHash, role, createdAt);
  }

  async findByUsername(username: string): Promise<UserEntity | undefined> {
    const result = await this.db.query(
      `SELECT user_id, username, email, password_hash, role, created_at
       FROM users
       WHERE username = $1`,
      [username]
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    return this.mapRowToUser(result.rows[0] as UserRow);
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const result = await this.db.query(
      `SELECT user_id, username, email, password_hash, role, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    return this.mapRowToUser(result.rows[0] as UserRow);
  }

  async findByUserId(userId: string): Promise<UserEntity | undefined> {
    const result = await this.db.query(
      `SELECT user_id, username, email, password_hash, role, created_at
       FROM users
       WHERE user_id = $1`,
      [userId]
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    return this.mapRowToUser(result.rows[0] as UserRow);
  }

  async listUsers(): Promise<UserEntity[]> {
    const result = await this.db.query(
      `SELECT user_id, username, email, password_hash, role, created_at
       FROM users
       ORDER BY created_at ASC`
    );
    return result.rows.map((row) => this.mapRowToUser(row as UserRow));
  }

  async hasAnyUsers(): Promise<boolean> {
    const result = await this.db.query("SELECT COUNT(*)::int AS total FROM users");
    return Number((result.rows[0] as { total: number }).total) > 0;
  }

  async validateCredentials(email: string, password: string): Promise<UserEntity | undefined> {
    const result = await this.db.query(
      `SELECT user_id, username, email, password_hash, role, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    const user = this.mapRowToUser(result.rows[0] as UserRow);
    return user.passwordHash === `hash:${password}` ? user : undefined;
  }

  private mapRowToUser(row: UserRow): UserEntity {
    return new UserEntity(
      row.user_id,
      row.username,
      row.email,
      row.password_hash,
      row.role,
      new Date(row.created_at)
    );
  }
}

type UserRow = {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date | string;
};
