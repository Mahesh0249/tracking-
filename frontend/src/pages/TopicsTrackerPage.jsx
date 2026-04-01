import { useEffect, useMemo, useState } from "react";
import { deleteDailyReport, getDailyReports, getProfileSettings, saveDailyReport } from "../api";
import { CN_TOPICS, DSA_TOPICS, OOPS_TOPICS, TECHNOLOGIES } from "../constants/roadmap";
import { showToast } from "../utils/toast";

const MOODS = ["Low", "Steady", "High"];

export default function TopicsTrackerPage() {
  const user = JSON.parse(localStorage.getItem("study-tracker-user") || "{}");
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    report_date: today,
    dsa_topic: DSA_TOPICS[0],
    dsa_problems_solved: 0,
    study_hours: 0,
    problems_learned_today: "",
    oops_topic: OOPS_TOPICS[0],
    cn_topic: CN_TOPICS[0],
    other_topics: "",
    technologies_learned: "",
    mood: "Steady",
  });

  const [reports, setReports] = useState([]);
  const [selectedTech, setSelectedTech] = useState([]);
  const [customTech, setCustomTech] = useState("");
  const [dailyGoal, setDailyGoal] = useState(3);
  const [dailyHourTarget, setDailyHourTarget] = useState(6);
  const [loading, setLoading] = useState(false);
  const [isExistingToday, setIsExistingToday] = useState(false);
  const [error, setError] = useState("");
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getDailyReports();
        setReports(data);
        const todayEntry = data.find((entry) => entry.date === today);
        if (todayEntry) {
          setIsExistingToday(true);
          setForm({
            report_date: todayEntry.date || today,
            dsa_topic: todayEntry.dsa_topic || DSA_TOPICS[0],
            dsa_problems_solved: todayEntry.dsa_problems_solved || 0,
            study_hours: todayEntry.study_hours || 0,
            problems_learned_today: todayEntry.problems_learned_today || "",
            oops_topic: todayEntry.oops_topic || OOPS_TOPICS[0],
            cn_topic: todayEntry.cn_topic || CN_TOPICS[0],
            other_topics: todayEntry.other_topics || "",
            technologies_learned: todayEntry.technologies_learned || "",
            mood: todayEntry.mood || "Steady",
          });

          const fromEntry = (todayEntry.technologies_learned || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          setSelectedTech(fromEntry);
          setDraftHydrated(true);
          return;
        }
      } catch {
        setReports([]);
      }

      if (user.email) {
        try {
          const settings = await getProfileSettings();
          setDailyGoal(Number(settings.dsa_daily_goal) || 3);
          setDailyHourTarget(Number(settings.daily_target_hours) || 6);
        } catch {
          setDailyGoal(3);
          setDailyHourTarget(6);
        }
      }

      const draft = localStorage.getItem("study-notes-draft");
      if (draft) {
        setForm((prev) => ({ ...prev, problems_learned_today: draft }));
      }
      setDraftHydrated(true);
    }

    load();
  }, [today, user.email]);

  useEffect(() => {
    if (!draftHydrated) return;
    localStorage.setItem("study-notes-draft", form.problems_learned_today);
  }, [form.problems_learned_today, draftHydrated]);

  useEffect(() => {
    const selected = reports.find((entry) => entry.date === form.report_date);
    if (!selected) {
      setIsExistingToday(false);
      setSelectedTech([]);
      return;
    }

    setIsExistingToday(true);
    setForm((prev) => ({
      ...prev,
      dsa_topic: selected.dsa_topic || DSA_TOPICS[0],
      dsa_problems_solved: selected.dsa_problems_solved || 0,
      study_hours: selected.study_hours || 0,
      problems_learned_today: selected.problems_learned_today || "",
      oops_topic: selected.oops_topic || OOPS_TOPICS[0],
      cn_topic: selected.cn_topic || CN_TOPICS[0],
      other_topics: selected.other_topics || "",
      technologies_learned: selected.technologies_learned || "",
      mood: selected.mood || "Steady",
    }));

    const fromEntry = (selected.technologies_learned || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setSelectedTech(fromEntry);
  }, [form.report_date, reports]);

  const dsaTopicCounts = useMemo(() => {
    const counts = {};
    reports.forEach((item) => {
      const key = item.dsa_topic;
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [reports]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  }

  function toggleTechnology(tech) {
    setSelectedTech((prev) =>
      prev.includes(tech) ? prev.filter((item) => item !== tech) : [...prev, tech]
    );
  }

  function removeTechnology(tech) {
    setSelectedTech((prev) => prev.filter((item) => item !== tech));
  }

  function addCustomTechnology() {
    const value = customTech.trim();
    if (!value) return;
    if (!selectedTech.includes(value)) setSelectedTech((prev) => [...prev, value]);
    setCustomTech("");
  }

  async function handleDeleteToday() {
    const targetDate = form.report_date || today;
    const ok = window.confirm(`Delete progress entry for ${targetDate}?`);
    if (!ok) return;

    try {
      setLoading(true);
      setError("");
      await deleteDailyReport(targetDate);
      setIsExistingToday(false);
      setForm({
        report_date: today,
        dsa_topic: DSA_TOPICS[0],
        dsa_problems_solved: 0,
        study_hours: 0,
        problems_learned_today: "",
        oops_topic: OOPS_TOPICS[0],
        cn_topic: CN_TOPICS[0],
        other_topics: "",
        technologies_learned: "",
        mood: "Steady",
      });
      setSelectedTech([]);
      setReports((prev) => prev.filter((item) => item.date !== targetDate));
      localStorage.removeItem("study-notes-draft");
      showToast(`Progress deleted for ${targetDate}`);
    } catch (err) {
      setError(err.message || "Could not delete today's progress.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      const payload = {
        ...form,
        report_date: form.report_date || today,
        dsa_problems_solved: Number(form.dsa_problems_solved) || 0,
        study_hours: Number(form.study_hours) || 0,
        technologies_learned: selectedTech.join(", "),
      };
      const response = await saveDailyReport(payload);
      setIsExistingToday(true);
      const todayDoc = {
        date: response.date,
        dsa_topic: payload.dsa_topic,
        dsa_problems_solved: payload.dsa_problems_solved,
        study_hours: payload.study_hours,
        problems_learned_today: payload.problems_learned_today,
        oops_topic: payload.oops_topic,
        cn_topic: payload.cn_topic,
        other_topics: payload.other_topics,
        technologies_learned: payload.technologies_learned,
        mood: payload.mood,
      };
      setReports((prev) => {
        const next = prev.filter((item) => item.date !== response.date);
        return [todayDoc, ...next];
      });
      showToast(`Progress saved for ${response.date}`);
    } catch (err) {
      setError(err.message || "Could not save progress.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <div className="card col-12 page-card">
        <h1>Topics Tracker</h1>
        <p className="helper">A clean entry log with grouped inputs for speed and consistency.</p>
      </div>

      <form className="col-12 grid" onSubmit={handleSubmit}>
        <div className="card col-6">
          <h3>Primary Session</h3>
          <div className="grid">
            <div className="col-4">
              <label className="field-label">Report Date</label>
              <input
                className="input"
                type="date"
                value={form.report_date}
                onChange={(e) => updateField("report_date", e.target.value)}
              />
            </div>
            <div className="col-8">
              <label className="field-label">DSA Topic</label>
              <select className="input" value={form.dsa_topic} onChange={(e) => updateField("dsa_topic", e.target.value)}>
                {DSA_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic} ({dsaTopicCounts[topic] || 0})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-4">
              <label className="field-label">Problems Solved</label>
              <input className="input" type="number" min="0" value={form.dsa_problems_solved} onChange={(e) => updateField("dsa_problems_solved", e.target.value)} />
              <small className="helper">{form.dsa_problems_solved || 0} / {dailyGoal}</small>
            </div>
            <div className="col-4">
              <label className="field-label">Study Hours</label>
              <input className="input" type="number" min="0" step="0.5" value={form.study_hours} onChange={(e) => updateField("study_hours", e.target.value)} />
              <small className="helper">{form.study_hours || 0} / {dailyHourTarget}</small>
            </div>
            <div className="col-8">
              <label className="field-label">Mood</label>
              <div className="tag-grid">
                {MOODS.map((moodValue) => (
                  <button
                    key={moodValue}
                    type="button"
                    className={`tag-pill ${form.mood === moodValue ? "selected" : ""}`}
                    onClick={() => updateField("mood", moodValue)}
                  >
                    {moodValue}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card col-6">
          <h3>Core Subjects</h3>
          <div>
            <label className="field-label">OOPS Topic</label>
            <select className="input" value={form.oops_topic} onChange={(e) => updateField("oops_topic", e.target.value)}>
              {OOPS_TOPICS.map((topic) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
          <div style={{ height: 16 }} />
          <div>
            <label className="field-label">CN Topic</label>
            <select className="input" value={form.cn_topic} onChange={(e) => updateField("cn_topic", e.target.value)}>
              {CN_TOPICS.map((topic) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
          <div style={{ height: 16 }} />
          <div>
            <label className="field-label">Other Topics</label>
            <input className="input" value={form.other_topics} onChange={(e) => updateField("other_topics", e.target.value)} placeholder="DBMS, OS, System Design" />
          </div>
        </div>

        <div className="card col-12">
          <h3>Technologies Learned</h3>
          <div className="tag-grid">
            {TECHNOLOGIES.map((tech) => (
              <button
                key={tech}
                type="button"
                className={`tag-pill ${selectedTech.includes(tech) ? "selected" : ""}`}
                onClick={() => toggleTechnology(tech)}
              >
                {tech}
              </button>
            ))}
            <button type="button" className="tag-pill" onClick={addCustomTechnology}>+ custom</button>
          </div>

          {selectedTech.length > 0 ? (
            <div className="selected-strip">
              {selectedTech.map((tech) => (
                <button key={`selected-${tech}`} type="button" className="tag-pill selected" onClick={() => removeTechnology(tech)}>
                  {tech} x
                </button>
              ))}
            </div>
          ) : null}

          <div style={{ height: 12 }} />
          <input
            className="input"
            placeholder="Add custom technology and click + custom"
            value={customTech}
            onChange={(e) => setCustomTech(e.target.value)}
          />
        </div>

        <div className="card col-12 notes-wrap">
          <h3>Reflection Notes</h3>
          <textarea
            className="textarea"
            value={form.problems_learned_today}
            onChange={(e) => updateField("problems_learned_today", e.target.value)}
            placeholder="Key learnings, mistakes, and patterns"
            maxLength={1200}
          />
          <span className="notes-counter">{form.problems_learned_today.length} / 1200</span>
        </div>

        <div className="col-12 row-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : isExistingToday ? "Update Progress" : "Save Progress"}
          </button>
          {isExistingToday ? (
            <button className="btn btn-danger" type="button" onClick={handleDeleteToday} disabled={loading}>
              Delete Today Progress
            </button>
          ) : null}
        </div>

        {error ? <div className="col-12"><p className="error">{error}</p></div> : null}
      </form>
    </div>
  );
}
