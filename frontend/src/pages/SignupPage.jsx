import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../api";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await signup(name, email, password);
      setMessage("Signup successful.");
      navigate("/login");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      <section className="auth-left card">
        <h1>Create Account</h1>
        <p className="helper auth-sub">Start your structured preparation today.</p>

        <form onSubmit={handleSubmit}>
          <label className="field-label">Name</label>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />

          <div style={{ height: 10 }} />

          <label className="field-label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <div style={{ height: 10 }} />

          <label className="field-label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            minLength={6}
            required
          />

          <div style={{ height: 12 }} />

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {message && <p className="ok">{message}</p>}

        <p className="helper auth-foot">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>

      <aside className="auth-right">
        <div className="auth-right-inner">
          <h2>Build Daily Momentum</h2>
          <p>Turn random preparation into a reliable system with streaks and day-wise plans.</p>
          <div className="quote-block">
            <p>"The dashboard keeps me accountable and I always know what to study next."</p>
            <span>Placement Aspirant</span>
          </div>
          <div className="brand-row">
            <span>Roadmap</span>
            <span>Streaks</span>
            <span>Plans</span>
            <span>Execution</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
