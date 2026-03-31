import { useMemo, useState } from "react";
import { generatePlan, parsePlan } from "../api";
import { showToast } from "../utils/toast";

function withTaskMeta(text, index) {
  const difficulty = index % 3 === 0 ? "Hard" : index % 2 === 0 ? "Medium" : "Easy";
  const estimate = difficulty === "Hard" ? "~60 mins" : difficulty === "Medium" ? "~45 mins" : "~30 mins";
  return { title: text, difficulty, estimate, note: "" };
}

export default function PlanStudioPage() {
  const [planText, setPlanText] = useState("");
  const [previewPlan, setPreviewPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generator, setGenerator] = useState({
    durationDays: 120,
    focusAreas: "DSA, FastAPI, React",
    dailyHours: 3,
  });

  const [activePlan, setActivePlan] = useState(
    JSON.parse(localStorage.getItem("study-tracker-parsed-plan") || "[]")
  );
  const [activeMeta, setActiveMeta] = useState(
    JSON.parse(localStorage.getItem("study-tracker-plan-meta") || "{}")
  );
  const [savedPlans, setSavedPlans] = useState(
    JSON.parse(localStorage.getItem("study-tracker-saved-plans") || "[]")
  );

  const previewTaskCount = useMemo(
    () => previewPlan.reduce((sum, day) => sum + (day.tasks?.length || 0), 0),
    [previewPlan]
  );

  function updateGen(field, value) {
    setGenerator((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGenerate() {
    try {
      setLoading(true);
      setError("");
      const data = await generatePlan(generator.durationDays, generator.focusAreas, generator.dailyHours);
      setPlanText(data.plan_text || "");
      showToast("AI plan generated");
    } catch (err) {
      setError(err.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  async function handleParsePreview() {
    if (!planText.trim()) return;

    try {
      setLoading(true);
      setError("");
      const parsed = await parsePlan(planText);
      const normalized = parsed.map((day) => ({
        day: day.day,
        tasks: (day.tasks || []).map((task, idx) => withTaskMeta(task, idx + 1)),
      }));
      setPreviewPlan(normalized);
      showToast("Plan preview ready");
    } catch (err) {
      setError(err.message || "Failed to parse plan");
    } finally {
      setLoading(false);
    }
  }

  function saveAsActive(plan) {
    const nextMeta = { totalDays: plan.length, loadedAt: new Date().toISOString().slice(0, 10) };
    localStorage.setItem("study-tracker-parsed-plan", JSON.stringify(plan));
    localStorage.setItem("study-tracker-task-status", JSON.stringify({}));
    localStorage.setItem("study-tracker-plan-meta", JSON.stringify(nextMeta));
    setActivePlan(plan);
    setActiveMeta(nextMeta);
  }

  function handleSavePlan() {
    if (previewPlan.length === 0) return;
    saveAsActive(previewPlan);

    const nextSaved = [
      {
        id: Date.now(),
        name: `Plan ${new Date().toLocaleDateString()}`,
        days: previewPlan.length,
        plan: previewPlan,
      },
      ...savedPlans,
    ].slice(0, 10);

    localStorage.setItem("study-tracker-saved-plans", JSON.stringify(nextSaved));
    setSavedPlans(nextSaved);
    showToast("Plan saved and activated");
  }

  function handleLoadActiveForEdit() {
    if (activePlan.length === 0) return;
    const raw = activePlan
      .map((day) => `Day ${day.day}:\n${(day.tasks || [])
        .map((task) => `- ${typeof task === "string" ? task : task.title}`)
        .join("\n")}`)
      .join("\n");
    setPlanText(raw);
    showToast("Loaded active plan for editing");
  }

  function handleSwitchPlan(item) {
    saveAsActive(item.plan);
    showToast(`${item.name} activated`);
  }

  function handleDeleteSavedPlan(planId) {
    const ok = window.confirm("Delete this saved plan?");
    if (!ok) return;

    const next = savedPlans.filter((item) => item.id !== planId);
    localStorage.setItem("study-tracker-saved-plans", JSON.stringify(next));
    setSavedPlans(next);
    showToast("Saved plan deleted");
  }

  function handleClearActivePlan() {
    const ok = window.confirm("Clear active plan and reset progress?");
    if (!ok) return;

    localStorage.removeItem("study-tracker-parsed-plan");
    localStorage.removeItem("study-tracker-task-status");
    localStorage.removeItem("study-tracker-plan-meta");
    setActivePlan([]);
    setActiveMeta({});
    showToast("Active plan cleared");
  }

  return (
    <div className="grid">
      <div className="card col-12 page-card">
        <div className="section-head">
          <div>
            <h1>Plan Studio</h1>
            <p className="helper">Code-editor style planning with AI generation and live preview. Supports Solve/Core/Tech/Extra format.</p>
          </div>
          <button className="btn btn-danger" type="button" onClick={handleClearActivePlan}>
            Clear Active Plan
          </button>
        </div>
        <p className="pill">
          Active: {activePlan.length} days
          {activeMeta.loadedAt ? ` (loaded on ${activeMeta.loadedAt})` : ""}
        </p>
      </div>

      <div className="col-12 split-screen">
        <div className="card">
          <h2>Generator + Parser</h2>
          <div className="grid" style={{ gap: 16 }}>
            <div className="col-4">
              <label className="field-label">Duration (days)</label>
              <input
                className="input"
                type="number"
                min="1"
                value={generator.durationDays}
                onChange={(e) => updateGen("durationDays", e.target.value)}
              />
            </div>
            <div className="col-4">
              <label className="field-label">Daily Hours</label>
              <input
                className="input"
                type="number"
                min="1"
                step="0.5"
                value={generator.dailyHours}
                onChange={(e) => updateGen("dailyHours", e.target.value)}
              />
            </div>
            <div className="col-4">
              <label className="field-label">Focus Areas</label>
              <input
                className="input"
                value={generator.focusAreas}
                onChange={(e) => updateGen("focusAreas", e.target.value)}
              />
            </div>
          </div>

          <div style={{ height: 16 }} />
          <div className="inline-actions">
            <button className="btn" type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate Plan"}
            </button>
            <button className="btn btn-primary" type="button" onClick={handleParsePreview} disabled={loading}>
              {loading ? "Parsing..." : "Parse Preview"}
            </button>
            <button className="btn" type="button" onClick={handleLoadActiveForEdit}>
              Edit Current Plan
            </button>
          </div>

          <div style={{ height: 16 }} />
          <label className="field-label">Plan Editor</label>
          <textarea
            className="textarea planner-editor"
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
            placeholder={
              "Day 1:\n\nSolve: Two Sum (1), Best Time to Buy and Sell Stock (121), Maximum Subarray (53)\nCore: OS Introduction + Process Concept\nTech: Install Python, setup virtual environment, create basic FastAPI app\nExtra: Revise array basics"
            }
          />
          {error && <p className="error">{error}</p>}
        </div>

        <div className="card">
          <h2>Live Preview</h2>
          <p className="helper">{previewPlan.length} days, {previewTaskCount} tasks</p>
          <div className="preview-scroll">
            {previewPlan.length === 0 ? (
              <p className="helper">Parse a plan to see preview.</p>
            ) : (
              previewPlan.map((day) => (
                <div key={day.day} className="preview-day">
                  <strong>Day {day.day}</strong>
                  <ul className="entry-list">
                    {day.tasks.map((task, idx) => (
                      <li key={`${day.day}-${idx}`}>
                        {typeof task === "string" ? task : `${task.title} (${task.difficulty}, ${task.estimate})`}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <button className="btn btn-primary" type="button" onClick={handleSavePlan} disabled={previewPlan.length === 0}>
            Save as Active Plan
          </button>
        </div>
      </div>

      <div className="card col-12">
        <h2>Saved Plans</h2>
        {savedPlans.length === 0 ? (
          <p className="helper">No saved plans yet.</p>
        ) : (
          <div className="saved-plans">
            {savedPlans.map((item) => (
              <div key={item.id} className="saved-plan-item">
                <span>{item.name} ({item.days} days)</span>
                <div className="inline-actions">
                  <button className="btn" type="button" onClick={() => handleSwitchPlan(item)}>
                    Activate
                  </button>
                  <button className="btn btn-danger" type="button" onClick={() => handleDeleteSavedPlan(item.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
