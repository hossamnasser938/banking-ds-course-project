import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ObservabilityService } from "../application/observability.service";
import { JwtAuthGuard } from "../../auth-client/api/guards/jwt-auth.guard";
import { SetRoutingTargetDto } from "./dto/set-routing-target.dto";

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

  @UseGuards(JwtAuthGuard)
  @Get("routing")
  async getRoutingStatus(@Req() request: { user: { role: "user" | "admin" } }) {
    if (request.user.role !== "admin") {
      throw new ForbiddenException("Admin role required");
    }
    return await this.observabilityService.getRoutingStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Post("routing")
  async setRoutingStatus(
    @Req() request: { user: { role: "user" | "admin" } },
    @Body() body: SetRoutingTargetDto
  ) {
    if (request.user.role !== "admin") {
      throw new ForbiddenException("Admin role required");
    }
    return await this.observabilityService.setBankingRouting(body);
  }
}
