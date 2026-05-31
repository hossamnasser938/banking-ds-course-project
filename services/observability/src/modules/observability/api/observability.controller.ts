import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards
} from "@nestjs/common";
import { ObservabilityService } from "../application/observability.service";
import { JwtAuthGuard } from "../../auth-client/api/guards/jwt-auth.guard";

@Controller("admin/nodes")
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @UseGuards(JwtAuthGuard)
  @Get("health")
  async getNodeHealth(@Req() request: { user: { role: "user" | "admin" } }) {
    if (request.user.role !== "admin") {
      throw new ForbiddenException("Admin role required");
    }
    return await this.observabilityService.getNodeHealthView();
  }
}
