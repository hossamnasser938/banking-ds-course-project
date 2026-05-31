import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

type PageShellProps = {
  title: string;
  children: ReactNode;
};

export function PageShell({ title, children }: PageShellProps) {
  const navigate = useNavigate();
  const rawAuth = localStorage.getItem("auth");
  const hasAuth = Boolean(rawAuth);
  let role: "user" | "admin" | undefined;
  if (rawAuth) {
    try {
      role = (JSON.parse(rawAuth) as { role?: "user" | "admin" }).role;
    } catch {
      role = undefined;
    }
  }
  const isAdmin = role === "admin";

  const onLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <h1 className="topbar-title">Distributed Banking</h1>
        <nav className="topbar-nav">
          {!isAdmin ? <Link to="/balance">Balance</Link> : null}
          {!isAdmin ? <Link to="/transfer">Transfer</Link> : null}
          {isAdmin ? <Link to="/admin/observability">Observability</Link> : null}
          {hasAuth ? (
            <button type="button" className="topbar-action" onClick={onLogout}>
              Logout
            </button>
          ) : null}
        </nav>
      </header>
      <main className="content">
        <section className="card">
          <h2 className="page-title">{title}</h2>
          {children}
        </section>
      </main>
    </div>
  );
}
