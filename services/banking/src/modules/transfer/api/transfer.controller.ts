import { Body, Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { TransferService } from "../application/transfer.service";
import { JwtAuthGuard } from "../../auth-client/api/guards/jwt-auth.guard";

@Controller("transfers")
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createTransfer(
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() request: { user: { userId: string } },
    @Body() body: CreateTransferDto
  ) {
    return this.transferService.createTransfer(
      idempotencyKey,
      request.user.userId,
      body.destinationAccountId,
      body.amount
    );
  }
}
