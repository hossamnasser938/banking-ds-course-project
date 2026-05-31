import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import * as crypto from "node:crypto";
import { IdentityRepository } from "../infrastructure/identity.repository";
import { LoginDto } from "../api/dto/login.dto";
import { RegisterDto } from "../api/dto/register.dto";

@Injectable()
export class AuthService {
  private static readonly DEFAULT_ADMIN = {
    username: "admin",
    email: "admin@gmail.com",
    password: "P@ssw0rd",
    role: "admin" as const
  };

  constructor(private readonly identityRepository: IdentityRepository) {}

  register(dto: RegisterDto) {
    if (this.identityRepository.findByUsername(dto.username)) {
      throw new ConflictException("Username already exists");
    }
    if (this.identityRepository.findByEmail(dto.email)) {
      throw new ConflictException("Email already exists");
    }
    const user = this.identityRepository.createUser(
      dto.username,
      dto.email,
      dto.password,
      dto.role ?? "user"
    );
    return {
      accessToken: this.issueToken(user.userId, user.role),
      userId: user.userId,
      username: user.username,
      role: user.role
    };
  }

  login(dto: LoginDto) {
    const user = this.identityRepository.validateCredentials(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return {
      accessToken: this.issueToken(user.userId, user.role),
      userId: user.userId,
      username: user.username,
      role: user.role
    };
  }

  seedDefaultAdminIfEmpty(): boolean {
    if (this.identityRepository.hasAnyUsers()) {
      return false;
    }

    const defaults = AuthService.DEFAULT_ADMIN;
    this.identityRepository.createUser(
      defaults.username,
      defaults.email,
      defaults.password,
      defaults.role
    );
    return true;
  }

  verifyToken(token: string): { userId: string; role: "user" | "admin" } {
    const parsed = this.parseToken(token);
    return { userId: parsed.sub, role: parsed.role };
  }

  verifyTokenWithIdentity(token: string): {
    userId: string;
    username: string;
    email: string;
    role: "user" | "admin";
  } {
    const parsed = this.parseToken(token);
    const user = this.identityRepository.findByUserId(parsed.sub);
    if (!user) {
      throw new UnauthorizedException("Unknown user");
    }
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role
    };
  }

  listUsers() {
    return {
      users: this.identityRepository.listUsers().map((user) => ({
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role
      }))
    };
  }

  private parseToken(token: string): { sub: string; role: "user" | "admin" } {
    try {
      const raw = Buffer.from(token, "base64url").toString("utf8");
      const parsed = JSON.parse(raw) as { sub: string; role: "user" | "admin" };
      return parsed;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }

  private issueToken(userId: string, role: string): string {
    return Buffer.from(
      JSON.stringify({ sub: userId, role, nonce: crypto.randomUUID() })
    ).toString("base64url");
  }
}
