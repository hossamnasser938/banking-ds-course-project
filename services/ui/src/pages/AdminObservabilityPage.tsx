import { useEffect, useState } from "react";
import {
  getNodeHealth,
  getRoutingStatus,
  setRoutingStatus
} from "../services/observabilityApi";
import { PageShell } from "../components/PageShell";

type NodeHealth = {
  nodeId: string;
  componentType: string;
  zone: string;
  status: "HEALTHY" | "UNHEALTHY" | "UNKNOWN";
};

type BankingRoutingState = {
  bankingAEnabled: boolean;
  bankingBEnabled: boolean;
  bankingAWeight: number;
  bankingBWeight: number;
};

export function AdminObservabilityPage() {
  const [nodes, setNodes] = useState<NodeHealth[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [routing, setRouting] = useState<BankingRoutingState>({
    bankingAEnabled: false,
    bankingBEnabled: false,
    bankingAWeight: 0,
    bankingBWeight: 0
  });
  const [actionStatus, setActionStatus] = useState<string>("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [pendingRouting, setPendingRouting] = useState<BankingRoutingState | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (!auth) {
      setError("Unauthorized");
      return;
    }
    const parsed = JSON.parse(auth) as { accessToken: string };
    setToken(parsed.accessToken);
    getNodeHealth(parsed.accessToken)
      .then((response) => {
        const list = (response as { nodes?: NodeHealth[] }).nodes ?? [];
        setNodes(list);
      })
      .catch(() => setError("Node data is unavailable at this time"));

    getRoutingStatus(parsed.accessToken)
      .then((routing) => {
        setRouting({
          bankingAEnabled: routing.bankingAEnabled,
          bankingBEnabled: routing.bankingBEnabled,
          bankingAWeight: routing.bankingAWeight,
          bankingBWeight: routing.bankingBWeight
        });
      })
      .catch(() => {
        setActionStatus("Routing control unavailable. Check observability service permissions.");
      });
  }, []);

  const badgeClass = (status: NodeHealth["status"]) => {
    if (status === "HEALTHY") return "badge badge-ok";
    if (status === "UNHEALTHY") return "badge badge-error";
    return "badge badge-warn";
  };

  const applyRouting = async (nextRouting: BankingRoutingState) => {
    if (!token) {
      return;
    }
    setIsSwitching(true);
    setPendingRouting(nextRouting);
    setActionStatus("");
    try {
      const result = await setRoutingStatus(token, {
        bankingAEnabled: nextRouting.bankingAEnabled,
        bankingBEnabled: nextRouting.bankingBEnabled
      });
      setRouting({
        bankingAEnabled: result.bankingAEnabled,
        bankingBEnabled: result.bankingBEnabled,
        bankingAWeight: result.bankingAWeight,
        bankingBWeight: result.bankingBWeight
      });
      setActionStatus(
        `Routing updated: A ${result.bankingAWeight}% / B ${result.bankingBWeight}% (post-switch propagation complete).`
      );
    } catch {
      setActionStatus("Failed to update routing. Check IAM permissions and retry.");
    } finally {
      setIsSwitching(false);
      setPendingRouting(null);
    }
  };

  const getBankingTargetForNode = (nodeId: string): "a" | "b" | null => {
    const normalized = nodeId.toLowerCase();
    if (
      normalized.includes("banking-a") ||
      normalized.includes("zone-a") ||
      normalized.includes("tag-a")
    ) {
      return "a";
    }
    if (
      normalized.includes("banking-b") ||
      normalized.includes("zone-b") ||
      normalized.includes("tag-b")
    ) {
      return "b";
    }
    return null;
  };

  const effectiveRouting = pendingRouting ?? routing;

  const handleNodeToggle = async (nodeTarget: "a" | "b", checked: boolean) => {
    const nextRouting: BankingRoutingState = {
      ...effectiveRouting,
      bankingAEnabled: nodeTarget === "a" ? checked : effectiveRouting.bankingAEnabled,
      bankingBEnabled: nodeTarget === "b" ? checked : effectiveRouting.bankingBEnabled
    };
    if (!nextRouting.bankingAEnabled && !nextRouting.bankingBEnabled) {
      setActionStatus("At least one banking service must remain enabled.");
      return;
    }
    if (nextRouting.bankingAEnabled && nextRouting.bankingBEnabled) {
      nextRouting.bankingAWeight = 50;
      nextRouting.bankingBWeight = 50;
    } else if (nextRouting.bankingAEnabled) {
      nextRouting.bankingAWeight = 100;
      nextRouting.bankingBWeight = 0;
    } else {
      nextRouting.bankingAWeight = 0;
      nextRouting.bankingBWeight = 100;
    }
    await applyRouting(nextRouting);
  };

  return (
    <PageShell title="Admin observability">
      <p className="page-subtitle">Live status of nodes and zones across the distributed system.</p>
      {error ? <p className="status status-error">{error}</p> : null}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Routing control</h3>
        <p className="status status-info">
          Traffic split: <strong>A {effectiveRouting.bankingAWeight}%</strong> /{" "}
          <strong>B {effectiveRouting.bankingBWeight}%</strong>
        </p>
        <p className="page-subtitle" style={{ margin: "0.4rem 0 0" }}>
          Checkboxes control Cloud Run revision traffic split (tag A/B) for the banking service.
        </p>
        {isSwitching ? (
          <p className="status status-info">
            Applying routing update... waiting for Cloud Run traffic propagation (can take up to ~90s).
          </p>
        ) : null}
        {actionStatus ? <p className="status status-info">{actionStatus}</p> : null}
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Node</th>
            <th>Component</th>
            <th>Zone</th>
            <th>Traffic enabled</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {nodes.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <span className="status status-info">No nodes reported yet.</span>
              </td>
            </tr>
          ) : (
            nodes.map((node) => {
              const nodeTarget = getBankingTargetForNode(node.nodeId);
              const isBankingNode = nodeTarget !== null;
              const isChecked =
                isBankingNode &&
                (nodeTarget === "a"
                  ? effectiveRouting.bankingAEnabled
                  : effectiveRouting.bankingBEnabled);
              const statusLabel = isBankingNode
                ? isChecked
                  ? "ENABLED"
                  : "DISABLED"
                : node.status;
              const statusClass = isBankingNode
                ? isChecked
                  ? "badge badge-ok"
                  : "badge badge-warn"
                : badgeClass(node.status);
              return (
                <tr key={node.nodeId}>
                  <td>{node.nodeId}</td>
                  <td>{node.componentType}</td>
                  <td>{node.zone}</td>
                  <td>
                    {isBankingNode ? (
                      <input
                        type="checkbox"
                        checked={Boolean(isChecked)}
                        disabled={isSwitching}
                        onChange={(event) => void handleNodeToggle(nodeTarget, event.target.checked)}
                        aria-label={`Toggle traffic for banking ${nodeTarget.toUpperCase()}`}
                      />
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td>
                    <span className={statusClass}>{statusLabel}</span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </PageShell>
  );
}
