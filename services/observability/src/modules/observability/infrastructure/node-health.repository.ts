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

@Injectable()
export class NodeHealthRepository {
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

  private async readNodeStatus(url: string): Promise<NodeHealth["status"]> {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/health`, {
        method: "GET"
      });
      return response.ok ? "HEALTHY" : "UNHEALTHY";
    } catch {
      return "UNKNOWN";
    }
  }
}
