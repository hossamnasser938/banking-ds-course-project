import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBalance } from "../services/balanceApi";
import { PageShell } from "../components/PageShell";

type Balance = { accountId: string; balance: number; currency: string };

export function BalancePage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (!auth) return;
    const token = JSON.parse(auth).accessToken as string;
    getBalance(token)
      .then((value) => setBalance(value))
      .catch(() => setError("Unable to load balance"));
  }, []);

  return (
    <PageShell title="Account balance">
      <p className="page-subtitle">Current account status and available funds.</p>
      {balance ? (
        <div className="grid-2">
          <div className="kv">
            <span className="k">Account ID</span>
            <span className="v">{balance.accountId}</span>
          </div>
          <div className="kv">
            <span className="k">Available Balance</span>
            <span className="v">
              {balance.balance} {balance.currency}
            </span>
          </div>
        </div>
      ) : (
        <p className={`status ${error ? "status-error" : "status-info"}`}>
          {error ?? "Loading account balance..."}
        </p>
      )}
      <p className="page-subtitle">
        Ready to send funds? <Link to="/transfer">Go to transfer page</Link>
      </p>
    </PageShell>
  );
}
