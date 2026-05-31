export type UserRole = "user" | "admin";

export class UserEntity {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly role: UserRole,
    public readonly createdAt: Date = new Date()
  ) {}
}
