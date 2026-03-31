import { useMemo, useState } from "react";
import { parsePlan } from "../api";
import { showToast } from "../utils/toast";

const BASE_PROMPT = `You are an expert placement mentor.

Your task is to create a **fully detailed personalized adaptive study plan** for placement preparation.

---

STEP 1: INPUT COLLECTION (STRICT INTERACTIVE MODE)

You MUST ask ONLY ONE question at a time.

Rules:

* Ask ONE question
* WAIT for my response
* Then ask the next
* Do NOT ask multiple questions together
* Do NOT generate the plan yet

Ask in this EXACT order:

1. What is your total duration for preparation (number of days)?
2. What is your placement goal? (Product-based / Service-based / specific companies)
3. How many hours can you study daily?
4. What is your current level? (Beginner / Intermediate / Advanced)
5. What are your strong areas?
6. What are your weak areas?
7. What topics have you already completed?
8. What tech stack do you prefer?
9. What type of focus do you want? (DSA / Development / Balanced)
10. Any constraints?

---

STEP 2: VALIDATION

* Ensure all inputs are clear
* If anything is vague or incomplete → ask follow-up questions (ONLY ONE at a time)
* Proceed ONLY when all inputs are clearly defined

---

STEP 3: PLAN GENERATION (INTERACTIVE OUTPUT MODE)

CRITICAL RULES:

1. DO NOT GENERATE FULL PLAN AT ONCE

* Generate ONLY 5–10 days at a time
* After each batch, STOP and ask:

"Do you want me to continue with the next set of days?"

* WAIT for user response before continuing

---

2. OUTPUT FORMAT (STRICT — DO NOT CHANGE)

Each day MUST follow EXACTLY this format:

Day X:

* Solve: <Problem Name (LC number)>, <Problem Name (LC number)>, <Problem Name (LC number)>
* Core: <topic>
* Tech: <task>
* Extra: <revision/practice>

---

3. DSA RULES (VERY IMPORTANT)

* ALWAYS include exact LeetCode problems with IDs
* 2–4 problems per day (based on difficulty)
* Problems MUST match the topic of that day
* Follow STRICT progression:

Arrays
→ Sliding Window
→ Two Pointers
→ Recursion
→ Trees
→ Graphs
→ Dynamic Programming

* DO NOT skip order
* DO NOT jump topics randomly

---

4. STRICT QUALITY RULES

* NO generic words like:
  → "practice problems"
  → "mixed problems"
  → "solve questions"

* ALWAYS list exact problems

* NO repetition of LeetCode problems across entire plan

* Maintain internal tracking of used problems

* Weak areas must appear MORE frequently

* Strong areas can appear less frequently

---

5. CORE SUBJECT RULE (MANDATORY DAILY)

Rotate evenly across:

* Operating Systems (OS)
* Database Management Systems (DBMS)
* Computer Networks (CN)
* Object-Oriented Programming (OOP)

---

6. TECH / PROJECT WORK (MANDATORY DAILY)

Every day MUST include:

* FastAPI backend work
* Database usage (SQLite/PostgreSQL)
* API building
* Authentication / middleware / optimization
* AI/ML integration gradually

Progression:
Basic APIs → CRUD → Auth → DB → Project → AI integration → Deployment

---

7. REALISTIC LOAD

* Maximum 4 tasks per day:

  1. DSA
  2. Core
  3. Tech
  4. Extra

* Match difficulty with:
  → Beginner level
  → 4 hours/day constraint

---

8. REVISION RULE

* Include periodic revision days
* During revision:
  ❌ DO NOT reuse same problems
  ✅ Use NEW problems from same patterns

---

STEP 4: CONTINUATION RULE

After every batch (5–10 days):

* STOP immediately
* Ask:

"Do you want me to continue with the next set of days?"

* ONLY continue after user says YES

---

STEP 5: FINAL COMPLETION

When all days are generated:

* End with:

"Plan completed."

---

ABSOLUTE RULES (DO NOT BREAK):

* Do NOT generate all days at once
* Do NOT skip any day
* Do NOT summarize
* Do NOT reduce detail
* Do NOT repeat problems
* Do NOT add explanations outside the format

ONLY output:
→ Structured daily plan
→ Continuation question after each batch`;

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

  async function handleCopyBasePrompt() {
    try {
      await navigator.clipboard.writeText(BASE_PROMPT);
      showToast("Base prompt copied");
    } catch {
      setError("Copy failed. Please select and copy the prompt manually.");
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

  function handleConfirmAndSavePlan() {
    if (previewPlan.length === 0) return;
    const ok = window.confirm("Confirm parsed preview and save as active plan?");
    if (!ok) return;
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
            <p className="helper">Copy the base prompt, generate externally, paste output, then parse and save.</p>
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
          <h2>Base Prompt + Parser</h2>
          <p className="pill">Prompt mode: copy and use on your own device</p>

          <div style={{ height: 12 }} />
          <label className="field-label">Base Prompt (fixed)</label>
          <textarea className="textarea planner-editor" value={BASE_PROMPT} readOnly />

          <div style={{ height: 16 }} />
          <div className="inline-actions">
            <button className="btn" type="button" onClick={handleCopyBasePrompt}>
              Copy Base Prompt
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
              "Paste ChatGPT output here in Day/Solve/Core/Tech/Extra format"
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
          <button className="btn btn-primary" type="button" onClick={handleConfirmAndSavePlan} disabled={previewPlan.length === 0}>
            Confirm and Save Parsed Plan
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
