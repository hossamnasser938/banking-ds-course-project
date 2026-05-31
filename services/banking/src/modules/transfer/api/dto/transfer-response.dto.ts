export class TransferResponseDto {
  transferId!: string;
  status!: "COMMITTED" | "REJECTED";
  sourceAccountId!: string;
  destinationAccountId!: string;
  amount!: number;
  message!: string;
}
