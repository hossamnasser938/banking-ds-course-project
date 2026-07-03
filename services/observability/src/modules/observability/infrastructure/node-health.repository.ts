import { Injectable } from "@nestjs/common";

type NodeHealth = {
  nodeId: string;
  componentType: string;
  zone: string;
  status: "HEALTHY" | "UNHEALTHY" | "UNKNOWN";
  lastObservedAt: string;
};

type ObservedNode = {
  nodeId: string;
  componentType: string;
  zone: string;
  url: string;
};

type ObservedServiceEndpoint = {
  serviceName: string;
  url: string;
  componentType?: string;
  zone?: string;
};

@Injectable()
export class NodeHealthRepository {
  private readonly probeTimeoutMs = Number(process.env.OBS_NODE_HEALTH_TIMEOUT_MS ?? 1200);
  private readonly probeMaxRetries = Number(process.env.OBS_NODE_HEALTH_MAX_RETRIES ?? 1);
  private readonly retryBackoffMs = Number(process.env.OBS_NODE_HEALTH_RETRY_BACKOFF_MS ?? 200);

  async listNodes(): Promise<NodeHealth[]> {
    const now = new Date().toISOString();
    const nodes: NodeHealth[] = [
      {
        nodeId: process.env.NODE_ID ?? "observability-local-1",
        componentType: "observability",
        zone: process.env.ZONE ?? "local-zone-observability",
        status: "HEALTHY",
        lastObservedAt: now
      }
    ];

    const observedNodes = this.getConfiguredObservedNodes();
    for (const node of observedNodes) {
      nodes.push({
        nodeId: node.nodeId,
        componentType: node.componentType,
        zone: node.zone,
        status: await this.readNodeStatus(node.url),
        lastObservedAt: new Date().toISOString()
      });
    }

    return nodes;
  }

  private getConfiguredObservedNodes(): ObservedNode[] {
    const serviceEndpoints = this.getConfiguredObservedServices();
    if (serviceEndpoints.length > 0) {
      return serviceEndpoints.map((service) => ({
        nodeId: `service-${service.serviceName}`,
        componentType: service.componentType ?? "service",
        zone: service.zone ?? "shared-zone",
        url: service.url
      }));
    }

    const raw = process.env.OBSERVED_NODES_JSON;
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as ObservedNode[];
      return parsed.filter(
        (node) =>
          Boolean(node?.nodeId) &&
          Boolean(node?.componentType) &&
          Boolean(node?.zone) &&
          Boolean(node?.url)
      );
    } catch {
      return [];
    }
  }

  private getConfiguredObservedServices(): ObservedServiceEndpoint[] {
    const raw = process.env.OBSERVED_SERVICES_JSON;
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as ObservedServiceEndpoint[];
      return parsed.filter((service) => Boolean(service?.serviceName) && Boolean(service?.url));
    } catch {
      return [];
    }
  }

  private async readNodeStatus(url: string): Promise<NodeHealth["status"]> {
    const healthUrl = `${url.replace(/\/$/, "")}/health`;

    for (let attempt = 0; attempt <= this.probeMaxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.probeTimeoutMs);
      try {
        const response = await fetch(healthUrl, {
          method: "GET",
          signal: controller.signal
        });
        if (!response.ok) {
          if (this.shouldRetryStatus(response.status) && attempt < this.probeMaxRetries) {
            await this.delay(this.retryBackoffMs * (attempt + 1));
            continue;
          }
          return "UNHEALTHY";
        }

        const payload = (await response.json()) as { status?: string };
        return payload.status === "HEALTHY" ? "HEALTHY" : "UNHEALTHY";
      } catch {
        if (attempt === this.probeMaxRetries) {
          return "UNKNOWN";
        }
        await this.delay(this.retryBackoffMs * (attempt + 1));
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return "UNKNOWN";
  }

  private shouldRetryStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
