import { Injectable } from "@nestjs/common";
import { NodeHealthRepository } from "../infrastructure/node-health.repository";
import { GcpRoutingService } from "./gcp-routing.service";
import { SetRoutingTargetDto } from "../api/dto/set-routing-target.dto";

@Injectable()
export class ObservabilityService {
  constructor(
    private readonly nodeHealthRepository: NodeHealthRepository,
    private readonly gcpRoutingService: GcpRoutingService
  ) {}

  async getNodeHealthView() {
    return {
      nodes: await this.nodeHealthRepository.listNodes()
    };
  }

  async getRoutingStatus() {
    return await this.gcpRoutingService.getRoutingStatus();
  }

  async setBankingRouting(input: SetRoutingTargetDto) {
    return await this.gcpRoutingService.setBankingRouting(input);
  }
}
