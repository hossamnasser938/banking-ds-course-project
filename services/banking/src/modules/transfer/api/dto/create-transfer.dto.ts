import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateTransferDto {
  @IsString()
  destinationAccountId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
