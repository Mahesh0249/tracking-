import { useEffect, useState } from "react";
import { getAdminOverview } from "../api";

export default function AdminPage() {
  const [overview, setOverview] = useState({ users: 0, reports: 0, active_sessions: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminOverview();
        setOverview(data);
      } catch (err) {
        setError(err.message || "Could not load admin overview");
      }
    }

    load();
  }, []);

  return (
    <div className="grid">
      <div className="card col-12 page-card">
        <h1>Admin Section</h1>
        <p className="helper">Foundation is ready for upcoming admin features and controls.</p>
      </div>

      {error ? <div className="card col-12"><p className="error">{error}</p></div> : null}

      <div className="card col-4 hero-stat">
        <strong>{overview.users}</strong>
        <span>Total Users</span>
      </div>
      <div className="card col-4 hero-stat">
        <strong>{overview.reports}</strong>
        <span>Total Reports</span>
      </div>
      <div className="card col-4 hero-stat">
        <strong>{overview.active_sessions}</strong>
        <span>Active Sessions</span>
      </div>

      <div className="card col-12">
        <h3>Coming Next</h3>
        <p className="helper">Role-based management, moderation tools, analytics export, and organization-level tracking.</p>
      </div>
    </div>
  );
}
