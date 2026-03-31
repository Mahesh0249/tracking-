import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const data = await login(email, password);
      localStorage.setItem("study-tracker-user", JSON.stringify(data.user));
      setMessage("Login successful.");
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      <section className="auth-left card">
        <h1>Welcome Back!</h1>
        <p className="helper auth-sub">Sign in to continue your preparation journey.</p>

        <form onSubmit={handleSubmit}>
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
          <div className="password-wrap">
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div style={{ height: 12 }} />

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {message && <p className="ok">{message}</p>}

        <p className="helper auth-foot">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </section>

      <aside className="auth-right">
        <div className="auth-right-inner">
          <h2>Study Smarter With Consistency</h2>
          <p>
            Track topics daily, keep streaks alive, and turn AI study plans into actionable tasks.
          </p>
          <div className="quote-block">
            <p>
              "This tracker made my preparation clear and consistent. Every day now starts with focus."
            </p>
            <span>Student Feedback</span>
          </div>
          <div className="brand-row">
            <span>DSA</span>
            <span>Aptitude</span>
            <span>CS Core</span>
            <span>Mock Tests</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
