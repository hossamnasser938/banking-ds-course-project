import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateTransferDto {
  @IsString()
  destinationUserId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
