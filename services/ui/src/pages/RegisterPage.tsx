import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { register } from "../services/authApi";
import { PageShell } from "../components/PageShell";

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await register({ username, email, password });
      setSuccess("Registration successful. You can now login.");
      setError(null);
      setUsername("");
      setEmail("");
      setPassword("");
    } catch (e) {
      setSuccess(null);
      if (e instanceof Error && e.message) {
        setError(e.message);
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <PageShell title="Create account">
      <p className="page-subtitle">Start with one account and access your distributed banking dashboard.</p>
      <form onSubmit={onSubmit} className="stack">
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="input"
            type="text"
            value={username}
            placeholder="unique username"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
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
            placeholder="Min 8 characters"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="button" type="submit">
          Create account
        </button>
      </form>
      <p className="page-subtitle">
        Already have an account? <Link to="/">Back to login</Link>
      </p>
      {success ? <p className="status status-ok">{success}</p> : null}
      {error ? <p className="status status-error">{error}</p> : null}
    </PageShell>
  );
}
