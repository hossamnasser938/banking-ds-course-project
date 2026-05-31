import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  getStatus() {
    return {
      status: "HEALTHY",
      staleThresholdSeconds: 15
    };
  }
}
