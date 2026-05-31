export class AccountEntity {
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
    public balance: number,
    public readonly currency: string = "USD"
  ) {}
}
