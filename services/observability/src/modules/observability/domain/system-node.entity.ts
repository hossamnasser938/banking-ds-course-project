export type NodeStatus = "HEALTHY" | "UNHEALTHY" | "UNKNOWN";

export class SystemNodeEntity {
  constructor(
    public readonly nodeId: string,
    public readonly componentType: string,
    public readonly zone: string,
    public status: NodeStatus = "HEALTHY",
    public readonly lastObservedAt: Date = new Date()
  ) {}
}
