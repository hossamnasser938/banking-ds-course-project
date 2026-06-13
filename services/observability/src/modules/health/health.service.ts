import { Injectable } from "@nestjs/common";
import { AuthClientService } from "../auth-client/application/auth-client.service";
import { ObservabilityService } from "../observability/application/observability.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly authClientService: AuthClientService,
    private readonly observabilityService: ObservabilityService
  ) {}

  async getStatus() {
    const authDependency = await this.checkAuthenticationService();
    const observedNodesDependency = await this.checkObservedNodes();

    const status =
      authDependency.status === "UNHEALTHY"
        ? "UNHEALTHY"
        : observedNodesDependency.status === "DEGRADED"
          ? "DEGRADED"
          : "HEALTHY";

    return {
      status,
      staleThresholdSeconds: 15,
      checkedAt: new Date().toISOString(),
      dependencies: [authDependency, observedNodesDependency]
    };
  }

  private async checkAuthenticationService(): Promise<{
    dependency: string;
    status: "HEALTHY" | "UNHEALTHY";
    details?: string;
  }> {
    const reachable = await this.authClientService.pingHealth();
    if (!reachable) {
      return {
        dependency: "authentication-service",
        status: "UNHEALTHY",
        details: "Auth service health endpoint unreachable"
      };
    }

    return {
      dependency: "authentication-service",
      status: "HEALTHY"
    };
  }

  private async checkObservedNodes(): Promise<{
    dependency: string;
    status: "HEALTHY" | "DEGRADED";
    details: string;
  }> {
    const nodeView = await this.observabilityService.getNodeHealthView();
    const monitoredNodes = nodeView.nodes.filter((node) => node.componentType !== "observability");
    const nonHealthyCount = monitoredNodes.filter((node) => node.status !== "HEALTHY").length;

    if (monitoredNodes.length === 0) {
      return {
        dependency: "observed-nodes",
        status: "HEALTHY",
        details: "No nodes configured for observation"
      };
    }

    if (nonHealthyCount > 0) {
      return {
        dependency: "observed-nodes",
        status: "DEGRADED",
        details: `${nonHealthyCount}/${monitoredNodes.length} monitored nodes are not healthy`
      };
    }

    return {
      dependency: "observed-nodes",
      status: "HEALTHY",
      details: `${monitoredNodes.length} monitored nodes are healthy`
    };
  }
}
