import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import EntriesPage from "./pages/EntriesPage";
import PlanStudioPage from "./pages/PlanStudioPage";
import ActionBoardPage from "./pages/ActionBoardPage";
import TopicsTrackerPage from "./pages/TopicsTrackerPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import ToastHost from "./components/ToastHost";
import { showToast } from "./utils/toast";

function RequireAuth({ children }) {
  const hasToken = Boolean(localStorage.getItem("study-tracker-token"));
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem("study-tracker-user") || "{}");
  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  const [menuOpen, setMenuOpen] = useState(false);
  const hasToken = Boolean(localStorage.getItem("study-tracker-token"));
  const user = useMemo(() => JSON.parse(localStorage.getItem("study-tracker-user") || "{}"), [location.key]);
  const isAdmin = user.role === "admin";

  function handleQuickNote() {
    navigate("/entries?new=1");
    setMenuOpen(false);
    showToast("Opened new note composer");
  }

  function handleQuickTask() {
    navigate("/action-board");
    setMenuOpen(false);
    showToast("Opened Tasks");
  }

  function handleQuickCalendar() {
    navigate("/topics-tracker");
    setMenuOpen(false);
    showToast("Opened Topics Tracker");
  }

  function handleUpgrade() {
    showToast("Upgrade plans coming soon");
  }

  return (
    <div className={`app-shell ${isAuthPage ? "auth-mode" : ""}`}>
      {!isAuthPage && (
        <div className="workspace-shell">
          <aside className="side-nav">
            <div className="logo">Personal Study Tracker</div>
            <div className="side-search">Search</div>
            <div className="side-action-row">
              <button className="btn side-note-btn" type="button" onClick={handleQuickNote}>+ Note</button>
              <button className="side-icon-btn" type="button" aria-label="Quick task" onClick={handleQuickTask}>✓</button>
              <button className="side-icon-btn" type="button" aria-label="Quick calendar" onClick={handleQuickCalendar}>▦</button>
            </div>
            <button className="menu-toggle" type="button" onClick={() => setMenuOpen((prev) => !prev)}>
              Menu
            </button>
            <nav className={`nav-links side-links ${menuOpen ? "open" : ""}`}>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Home
              </NavLink>
              <NavLink
                to="/topics-tracker"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Topics
              </NavLink>
              <NavLink
                to="/entries"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Notes
              </NavLink>
              <NavLink
                to="/action-board"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Tasks
              </NavLink>
              <NavLink
                to="/plan-studio"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Plan
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </NavLink>
              {isAdmin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""} admin-chip`}
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </NavLink>
              ) : null}
            </nav>
            <NavLink to="/profile" className="side-account" onClick={() => setMenuOpen(false)}>
              <div className="side-avatar">{(user.name || "U").slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{user.name || "User"}</strong>
                <p>{user.email || ""}</p>
              </div>
            </NavLink>
            <button className="btn side-upgrade" type="button" onClick={handleUpgrade}>Upgrade</button>
          </aside>
          <main className="workspace-main">
            <Routes>
              <Route path="/" element={<Navigate to={hasToken ? "/dashboard" : "/login"} replace />} />
              <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
              <Route path="/topics-tracker" element={<RequireAuth><TopicsTrackerPage /></RequireAuth>} />
              <Route path="/entries" element={<RequireAuth><EntriesPage /></RequireAuth>} />
              <Route path="/plan-studio" element={<RequireAuth><PlanStudioPage /></RequireAuth>} />
              <Route path="/action-board" element={<RequireAuth><ActionBoardPage /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminPage /></RequireAdmin></RequireAuth>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      )}
      {isAuthPage ? (
        <Routes>
          <Route path="/" element={<Navigate to={hasToken ? "/dashboard" : "/login"} replace />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/topics-tracker" element={<RequireAuth><TopicsTrackerPage /></RequireAuth>} />
          <Route path="/entries" element={<RequireAuth><EntriesPage /></RequireAuth>} />
          <Route path="/plan-studio" element={<RequireAuth><PlanStudioPage /></RequireAuth>} />
          <Route path="/action-board" element={<RequireAuth><ActionBoardPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminPage /></RequireAdmin></RequireAuth>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : null}

      <ToastHost />
    </div>
  );
}

export default App;


