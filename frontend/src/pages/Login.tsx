import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api";
import { useAuth } from "../auth";


export default function Login() {
  const [email, setEmail] = useState("admin@velozity.dev");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const { setUser } = useAuth();
  const nav = useNavigate();


  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const d = await login(email, password);
      setUser(d.user);
     nav("/", { replace: true });
    } catch (e: any) {
      setError(e.response?.data?.error?.message || "Login failed");
    }
  };


  return (
    <div className="login">
      <form onSubmit={submit} className="card">
        <h1>Project Dashboard</h1>
        <p className="muted">Velozity Global Solutions</p>
        {error && <div className="error">{error}</div>}
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button>Sign in</button>
        <small>Seed password: Password123!</small>
      </form>
    </div>
  );
}
