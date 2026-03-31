import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import EntriesPage from "./pages/EntriesPage";
import PlanStudioPage from "./pages/PlanStudioPage";
import ActionBoardPage from "./pages/ActionBoardPage";
import TopicsTrackerPage from "./pages/TopicsTrackerPage";
import ProfilePage from "./pages/ProfilePage";
import ToastHost from "./components/ToastHost";

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`app-shell ${isAuthPage ? "auth-mode" : ""}`}>
      {!isAuthPage && (
        <header className="top-nav">
          <div className="logo">Personal Study Tracker</div>
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((prev) => !prev)}>
            Menu
          </button>
          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/topics-tracker"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              Topics Tracker
            </NavLink>
            <NavLink
              to="/entries"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              Progress Log
            </NavLink>
            <NavLink
              to="/plan-studio"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              Plan Studio
            </NavLink>
            <NavLink
              to="/action-board"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              Action Board
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </NavLink>
          </nav>
        </header>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/topics-tracker" element={<TopicsTrackerPage />} />
        <Route path="/entries" element={<EntriesPage />} />
        <Route path="/plan-studio" element={<PlanStudioPage />} />
        <Route path="/action-board" element={<ActionBoardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <ToastHost />
    </div>
  );
}

export default App;


