import { IsBoolean } from "class-validator";

export class SetRoutingTargetDto {
  @IsBoolean()
  bankingAEnabled!: boolean;

  @IsBoolean()
  bankingBEnabled!: boolean;
}
