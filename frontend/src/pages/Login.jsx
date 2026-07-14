import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const demoAccounts = [
  { email: "admin@ethara.ai", password: "admin123", role: "Admin" },
  { email: "hr@ethara.ai", password: "hr12345", role: "HR" },
  { email: "employee@ethara.ai", password: "emp12345", role: "Employee" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@ethara.ai");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-brand-600 mb-1">Ethara Seats</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Seat Allocation & Project Mapping System
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-gray-400 mb-2">Demo accounts (click to fill)</p>
          <div className="flex flex-wrap gap-2">
            {demoAccounts.map((a) => (
              <button
                key={a.email}
                className="badge bg-gray-100 text-gray-600 hover:bg-gray-200"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
              >
                {a.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
