import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authApi";
import { PageShell } from "../components/PageShell";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const auth = await login({ email, password });
      localStorage.setItem("auth", JSON.stringify(auth));
      navigate(auth.role === "admin" ? "/admin/observability" : "/balance");
    } catch {
      setError("Login failed");
    }
  };

  return (
    <PageShell title="Welcome back">
      <p className="page-subtitle">Sign in to view your balance, make transfers, and monitor the system.</p>
      <form onSubmit={onSubmit} className="stack">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            placeholder="Your password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="button" type="submit">
          Login
        </button>
      </form>
      <p className="page-subtitle">
        New user? <Link to="/register">Create an account</Link>
      </p>
      {error ? <p className="status status-error">{error}</p> : null}
    </PageShell>
  );
}
