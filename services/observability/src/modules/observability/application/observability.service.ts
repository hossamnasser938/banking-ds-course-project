import { Injectable } from "@nestjs/common";
import { NodeHealthRepository } from "../infrastructure/node-health.repository";

@Injectable()
export class ObservabilityService {
  constructor(private readonly nodeHealthRepository: NodeHealthRepository) {}

  async getNodeHealthView() {
    return {
      nodes: await this.nodeHealthRepository.listNodes()
    };
  }
}
