import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { BalanceService } from "../application/balance.service";
import { JwtAuthGuard } from "../../auth-client/api/guards/jwt-auth.guard";

@Controller("accounts")
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me/balance")
  getMyBalance(
    @Req() request: { user: { userId: string; role: "user" | "admin" } }
  ) {
    return this.balanceService.getBalanceByUserId(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("recipients")
  async getRecipients(
    @Req() request: { user: { userId: string; role: "user" | "admin" } }
  ) {
    return await this.balanceService.listRecipients(request.user.userId);
  }
}
