import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getDailyReports, getDsaStreak, getProfileSettings, getStreak } from "../api";
import { ROADMAP_FOCUS } from "../constants/roadmap";

function getWeekNumberIn16(studyStartDate) {
  if (!studyStartDate) return 1;
  const start = new Date(studyStartDate);
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  return Math.min(16, Math.floor(diffDays / 7) + 1);
}

function Sparkline({ points = [] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(1, max - min);
  const step = 100 / Math.max(1, points.length - 1);
  const d = points
    .map((point, index) => {
      const x = index * step;
      const y = 36 - ((point - min) / range) * 28;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function DashboardPage() {
  const [reports, setReports] = useState([]);
  const [streak, setStreak] = useState(0);
  const [dsaStreak, setDsaStreak] = useState(0);
  const [settings, setSettings] = useState({
    weekly_dsa_target: 20,
    study_start_date: "",
    placement_target_date: "",
    weekly_off_day: "Sunday",
  });
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("study-tracker-user") || "{}");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [reportData, streakData, dsaData] = await Promise.all([
          getDailyReports(),
          getStreak(),
          getDsaStreak(),
        ]);
        setReports(reportData);
        setStreak(streakData.streak || 0);
        setDsaStreak(dsaData.dsa_streak || 0);

        if (user.email) {
          const data = await getProfileSettings(user.email);
          setSettings(data);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user.email]);

  const today = new Date().toISOString().slice(0, 10);
  const hasLoggedToday = reports.some((report) => report.date === today);
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const isOffDay = settings.weekly_off_day === dayName;

  const trend = useMemo(() => {
    const map = new Map(reports.map((r) => [r.date, r]));
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const report = map.get(key);
      days.push(report ? Number(report.dsa_problems_solved || 0) + Number(report.study_hours || 0) : 0);
    }
    return days;
  }, [reports]);

  const weeklyProblems = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    const mondayKey = monday.toISOString().slice(0, 10);

    return reports
      .filter((r) => r.date >= mondayKey)
      .reduce((sum, r) => sum + Number(r.dsa_problems_solved || 0), 0);
  }, [reports]);

  const weekNumber = getWeekNumberIn16(settings.study_start_date);
  const focus = ROADMAP_FOCUS[weekNumber - 1] || ROADMAP_FOCUS[0];

  const daysRemaining = useMemo(() => {
    if (!settings.placement_target_date) return null;
    const target = new Date(settings.placement_target_date);
    const now = new Date();
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
  }, [settings.placement_target_date]);

  return (
    <div className="grid">
      <div className="card col-12 page-card">
        <h1>Dashboard</h1>
        <p className="helper">Deep visibility into consistency, roadmap position, and current velocity.</p>
      </div>

      {loading ? (
        <>
          <div className="card col-4 skeleton-block" />
          <div className="card col-4 skeleton-block" />
          <div className="card col-4 skeleton-block" />
        </>
      ) : (
        <>
          <div className="card col-4 hero-stat bento-card">
            <Sparkline points={trend} />
            <strong>{streak}</strong>
            <span>Study Streak</span>
          </div>
          <div className="card col-4 hero-stat bento-card">
            <Sparkline points={trend.map((v) => Math.max(0, v - 2))} />
            <strong>{dsaStreak}</strong>
            <span>DSA Streak</span>
          </div>
          <div className="card col-4 hero-stat bento-card">
            <Sparkline points={trend.map((v) => v + 1)} />
            <strong>{reports.length}</strong>
            <span>Tracked Days</span>
          </div>
        </>
      )}

      <div className="card col-6 bento-card">
        <h3>Today Status</h3>
        {isOffDay ? (
          <p className="ok">Planned off day: {dayName}</p>
        ) : hasLoggedToday ? (
          <p className="ok">Entry logged today. Keep momentum.</p>
        ) : (
          <p className="error">No entry yet for today. Log progress in Topics Tracker.</p>
        )}
      </div>

      <div className="card col-6 bento-card">
        <h3>Roadmap Position</h3>
        <p className="pill">Week {weekNumber} of 16</p>
        <p className="helper">Current focus: {focus}</p>
        {daysRemaining !== null ? <p className="helper">{daysRemaining} days to placement target</p> : null}
      </div>

      <div className="card col-6 bento-card">
        <h3>DSA This Week</h3>
        <p className="pill">{weeklyProblems} / {settings.weekly_dsa_target || 20} problems</p>
        <div className="progress-wrap">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, (weeklyProblems / Math.max(1, settings.weekly_dsa_target || 20)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="card col-6 bento-card">
        <h3>Quick Navigation</h3>
        <div className="quick-links">
          <Link className="btn btn-primary" to="/topics-tracker">Topics Tracker</Link>
          <Link className="btn" to="/entries">Progress Log</Link>
          <Link className="btn" to="/plan-studio">Plan Studio</Link>
          <Link className="btn" to="/action-board">Action Board</Link>
          <Link className="btn" to="/profile">Profile</Link>
        </div>
      </div>
    </div>
  );
}
