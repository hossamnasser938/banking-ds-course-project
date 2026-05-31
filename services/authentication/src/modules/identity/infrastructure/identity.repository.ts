import { Injectable } from "@nestjs/common";
import * as crypto from "node:crypto";
import { UserEntity, UserRole } from "../domain/user.entity";

@Injectable()
export class IdentityRepository {
  private readonly usersByUsername = new Map<string, UserEntity>();
  private readonly usersByEmail = new Map<string, UserEntity>();

  createUser(
    username: string,
    email: string,
    password: string,
    role: UserRole = "user"
  ): UserEntity {
    const user = new UserEntity(
      crypto.randomUUID(),
      username,
      email,
      `hash:${password}`,
      role
    );
    this.usersByUsername.set(username, user);
    this.usersByEmail.set(email, user);
    return user;
  }

  findByUsername(username: string): UserEntity | undefined {
    return this.usersByUsername.get(username);
  }

  findByEmail(email: string): UserEntity | undefined {
    return this.usersByEmail.get(email);
  }

  findByUserId(userId: string): UserEntity | undefined {
    for (const user of this.usersByEmail.values()) {
      if (user.userId === userId) {
        return user;
      }
    }
    return undefined;
  }

  listUsers(): UserEntity[] {
    return Array.from(this.usersByEmail.values());
  }

  hasAnyUsers(): boolean {
    return this.usersByEmail.size > 0;
  }

  validateCredentials(email: string, password: string): UserEntity | undefined {
    const user = this.findByEmail(email);
    if (!user) return undefined;
    return user.passwordHash === `hash:${password}` ? user : undefined;
  }
}
