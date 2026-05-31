import { useEffect, useState } from "react";
import { getNodeHealth } from "../services/observabilityApi";
import { PageShell } from "../components/PageShell";

type NodeHealth = {
  nodeId: string;
  componentType: string;
  zone: string;
  status: "HEALTHY" | "UNHEALTHY" | "UNKNOWN";
};

export function AdminObservabilityPage() {
  const [nodes, setNodes] = useState<NodeHealth[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (!auth) {
      setError("Unauthorized");
      return;
    }
    const parsed = JSON.parse(auth) as { accessToken: string };
    getNodeHealth(parsed.accessToken)
      .then((response) => {
        const list = (response as { nodes?: NodeHealth[] }).nodes ?? [];
        setNodes(list);
      })
      .catch(() => setError("Node data is unavailable at this time"));
  }, []);

  const badgeClass = (status: NodeHealth["status"]) => {
    if (status === "HEALTHY") return "badge badge-ok";
    if (status === "UNHEALTHY") return "badge badge-error";
    return "badge badge-warn";
  };

  return (
    <PageShell title="Admin observability">
      <p className="page-subtitle">Live status of nodes and zones across the distributed system.</p>
      {error ? <p className="status status-error">{error}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Node</th>
            <th>Component</th>
            <th>Zone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {nodes.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <span className="status status-info">No nodes reported yet.</span>
              </td>
            </tr>
          ) : (
            nodes.map((node) => (
              <tr key={node.nodeId}>
                <td>{node.nodeId}</td>
                <td>{node.componentType}</td>
                <td>{node.zone}</td>
                <td>
                  <span className={badgeClass(node.status)}>{node.status}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </PageShell>
  );
}
