import { useEffect, useState } from "react";
import {
  getDsaStreak,
  getProfileSettings,
  getProfileSummary,
  saveProfileSettings,
} from "../api";
import { showToast } from "../utils/toast";

const OFF_DAYS = ["Sunday", "Saturday", "Friday", "Wednesday", "Custom"];

export default function ProfilePage() {
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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [profileSummary, streak] = await Promise.all([getProfileSummary(), getDsaStreak()]);
        setSummary(profileSummary);
        setDsaStreak(streak.dsa_streak || 0);

        if (profile.email) {
          const data = await getProfileSettings(profile.email);
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
        email: profile.email,
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

  return (
    <div className="grid">
      <div className="card col-12 hero-banner">
        <h1>Profile and Targets</h1>
        <p className="helper">Set your baseline once and make dashboard metrics reliable.</p>
        {loading ? <p className="helper">Loading streak...</p> : <p className="hero-value">{dsaStreak} day DSA streak</p>}
      </div>

      <div className="card col-4">
        <div className="section-head">
          <h3>Name</h3>
          <button className="btn" type="button" onClick={() => setEditingProfile((prev) => !prev)}>Edit</button>
        </div>
        {editingProfile ? (
          <input className="input" value={profile.name} onChange={(e) => onProfileChange("name", e.target.value)} />
        ) : (
          <p>{profile.name || "Not available"}</p>
        )}
      </div>

      <div className="card col-8">
        <h3>Email</h3>
        {editingProfile ? (
          <input className="input" value={profile.email} onChange={(e) => onProfileChange("email", e.target.value)} />
        ) : (
          <p>{profile.email || "Not available"}</p>
        )}
      </div>

      <form className="card col-12" onSubmit={handleSave}>
        <h2>Study Configuration</h2>
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
      </form>

      <div className="card col-4 hero-stat">
        <strong>{summary.total_days_tracked || 0}</strong>
        <span>Days Tracked</span>
      </div>
      <div className="card col-4 hero-stat">
        <strong>{summary.total_dsa_problems || 0}</strong>
        <span>Total DSA Problems</span>
      </div>
      <div className="card col-4 hero-stat">
        <strong>{summary.total_study_hours || 0}</strong>
        <span>Total Study Hours</span>
      </div>

      <div className="card col-12">
        <h3>Technologies Learned</h3>
        <p>{summary.technologies?.join(", ") || "No technologies logged yet"}</p>
      </div>
    </div>
  );
}
