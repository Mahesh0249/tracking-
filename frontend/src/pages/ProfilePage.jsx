import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDsaStreak,
  getProfileSettings,
  getProfileSummary,
  logout,
  saveProfileSettings,
} from "../api";
import { showToast } from "../utils/toast";

const OFF_DAYS = ["Sunday", "Saturday", "Friday", "Wednesday", "Custom"];

export default function ProfilePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const userFromStorage = JSON.parse(localStorage.getItem("study-tracker-user") || "{}");

  const [summary, setSummary] = useState({
    total_days_tracked: 0,
    total_dsa_problems: 0,
    total_study_hours: 0,
    technologies: [],
  });
  const [dsaStreak, setDsaStreak] = useState(0);
  const [settings, setSettings] = useState({
    study_start_date: today,
    daily_target_hours: 2,
    dsa_daily_goal: 3,
    weekly_dsa_target: 20,
    placement_target_date: "",
    weekly_off_day: "Sunday",
  });
  const [profile, setProfile] = useState({
    name: userFromStorage.name || "",
    email: userFromStorage.email || "",
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const safeDays = Number(summary.total_days_tracked || 0);
  const safeProblems = Number(summary.total_dsa_problems || 0);
  const safeHours = Number(summary.total_study_hours || 0);
  const rankValue = Math.max(1, 3000000 - safeProblems * 250 - dsaStreak * 40);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [profileSummary, streak] = await Promise.all([getProfileSummary(), getDsaStreak()]);
        setSummary(profileSummary);
        setDsaStreak(streak.dsa_streak || 0);

        if (profile.email) {
          const data = await getProfileSettings();
          setSettings({
            study_start_date: data.study_start_date || today,
            daily_target_hours: data.daily_target_hours || 2,
            dsa_daily_goal: data.dsa_daily_goal || 3,
            weekly_dsa_target: data.weekly_dsa_target || 20,
            placement_target_date: data.placement_target_date || "",
            weekly_off_day: data.weekly_off_day || "Sunday",
          });
        }
      } catch {
        setError("Could not load profile data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [profile.email, today]);

  function onSettingsChange(field, value) {
    if (error) setError("");
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function onProfileChange(field, value) {
    if (error) setError("");
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function resetSettingsToDefaults() {
    const ok = window.confirm("Reset study settings to defaults?");
    if (!ok) return;

    setSettings({
      study_start_date: today,
      daily_target_hours: 2,
      dsa_daily_goal: 3,
      weekly_dsa_target: 20,
      placement_target_date: "",
      weekly_off_day: "Sunday",
    });
    showToast("Defaults restored. Save to persist.");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!settings.study_start_date) {
      setError("Study start date is required.");
      return;
    }
    if (!profile.email) {
      setError("Email is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      localStorage.setItem("study-tracker-user", JSON.stringify(profile));
      await saveProfileSettings({
        study_start_date: settings.study_start_date,
        daily_target_hours: Number(settings.daily_target_hours) || 2,
        dsa_daily_goal: Number(settings.dsa_daily_goal) || 3,
        weekly_dsa_target: Number(settings.weekly_dsa_target) || 20,
        placement_target_date: settings.placement_target_date,
        weekly_off_day: settings.weekly_off_day,
      });
      setEditingProfile(false);
      showToast("Profile settings saved");
    } catch {
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Ignore request errors and clear client session anyway.
    }
    localStorage.removeItem("study-tracker-token");
    localStorage.removeItem("study-tracker-user");
    navigate("/login", { replace: true });
  }

  async function handleSwitchAccount() {
    await handleLogout();
  }

  return (
    <div className="profile-layout">
      <aside className="card profile-sidebar">
        <div className="profile-id-wrap">
          <div className="profile-avatar" aria-hidden="true">{(profile.name || "U").slice(0, 1).toUpperCase()}</div>
          <div>
            <h2 className="profile-name">{profile.name || "Your Name"}</h2>
            <p className="helper">{profile.email || "your@email.com"}</p>
            <p className="profile-rank">Rank {rankValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="profile-follow-row" aria-label="Followers summary">
          <p><strong>0</strong> Following</p>
          <span>|</span>
          <p><strong>0</strong> Followers</p>
        </div>

        <button className="btn profile-edit-btn" type="button" onClick={() => setEditingProfile((prev) => !prev)}>
          {editingProfile ? "Done Editing" : "Edit Profile"}
        </button>

        <div className="profile-mini-grid">
          <div>
            <strong>{safeDays}</strong>
            <span>Tracked Days</span>
          </div>
          <div>
            <strong>{dsaStreak}</strong>
            <span>Current Streak</span>
          </div>
        </div>

        <div className="profile-section-block">
          <h3>Summary</h3>
          <ul className="stats-list">
            <li><span>Total Problems Solved</span><strong>{safeProblems}</strong></li>
            <li><span>Total Study Hours</span><strong>{safeHours}</strong></li>
            <li><span>Tracked Technologies</span><strong>{summary.technologies?.length || 0}</strong></li>
            <li><span>Current Rank</span><strong>{rankValue.toLocaleString()}</strong></li>
          </ul>
        </div>

        <div className="profile-section-block">
          <h3>Account Actions</h3>
          <div className="inline-actions">
            <button className="btn" type="button" onClick={handleSwitchAccount}>Switch Account</button>
            <button className="btn btn-danger" type="button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </aside>

      <section className="profile-main">
        <div className="card profile-panel">
          <h3>Profile Details</h3>
          <div className="profile-form-grid">
            <div>
              <label className="field-label">Name</label>
              <input className="input" value={profile.name} onChange={(e) => onProfileChange("name", e.target.value)} disabled={!editingProfile} />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input className="input" value={profile.email} onChange={(e) => onProfileChange("email", e.target.value)} disabled={!editingProfile} />
            </div>
          </div>
        </div>

        <form className="card profile-panel" onSubmit={handleSave}>
          <h3>Study Configuration</h3>
          <div className="grid">
            <div className="col-3">
              <label className="field-label">Study Start Date</label>
              <input className="input" type="date" value={settings.study_start_date} onChange={(e) => onSettingsChange("study_start_date", e.target.value)} required />
            </div>
            <div className="col-3">
              <label className="field-label">Placement Target Date</label>
              <input className="input" type="date" value={settings.placement_target_date} onChange={(e) => onSettingsChange("placement_target_date", e.target.value)} />
            </div>
            <div className="col-2">
              <label className="field-label">Daily Target Hours</label>
              <input className="input" type="number" min="0" step="0.5" value={settings.daily_target_hours} onChange={(e) => onSettingsChange("daily_target_hours", e.target.value)} />
            </div>
            <div className="col-2">
              <label className="field-label">DSA Daily Goal</label>
              <input className="input" type="number" min="0" value={settings.dsa_daily_goal} onChange={(e) => onSettingsChange("dsa_daily_goal", e.target.value)} />
            </div>
            <div className="col-2">
              <label className="field-label">Weekly DSA Target</label>
              <input className="input" type="number" min="0" value={settings.weekly_dsa_target} onChange={(e) => onSettingsChange("weekly_dsa_target", e.target.value)} />
            </div>
            <div className="col-3">
              <label className="field-label">Weekly Off Day</label>
              <select className="input" value={settings.weekly_off_day} onChange={(e) => onSettingsChange("weekly_off_day", e.target.value)}>
                {OFF_DAYS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ height: 12 }} />
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
            <button className="btn btn-danger" type="button" onClick={resetSettingsToDefaults} disabled={saving}>
              Reset to Default
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {loading ? <p className="helper">Loading streak...</p> : <p className="helper">Current DSA streak: {dsaStreak} days</p>}
        </form>

      </section>
    </div>
  );
}
