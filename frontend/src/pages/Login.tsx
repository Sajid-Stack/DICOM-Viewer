import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      // the actual auth token lives in an httpOnly cookie we can't read from JS,
      // this flag just tells the frontend "yep, we're logged in" for routing
      localStorage.setItem("loggedIn", "true");
      navigate("/worklist");
    } catch {
      setErr("wrong email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Sign in</h1>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button className="btn-primary" disabled={loading}>
          {loading ? "signing in..." : "Sign in"}
        </button>

        {err && <p className="error">{err}</p>}
      </form>
    </div>
  );
}
