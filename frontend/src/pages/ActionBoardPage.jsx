import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function getCurrentPlanDay(meta, totalDays) {
  if (!meta?.loadedAt) return 1;
  const start = new Date(meta.loadedAt);
  const now = new Date();
  const elapsed = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  return Math.min(totalDays || 1, elapsed + 1);
}

function normalizeTask(task, idx) {
  if (typeof task === "string") {
    const difficulty = idx % 3 === 0 ? "Hard" : idx % 2 === 0 ? "Medium" : "Easy";
    const estimate = difficulty === "Hard" ? "~60 mins" : difficulty === "Medium" ? "~45 mins" : "~30 mins";
    return { title: task, difficulty, estimate, note: "" };
  }

  return {
    title: task.title || "Task",
    difficulty: task.difficulty || "Medium",
    estimate: task.estimate || "~45 mins",
    note: task.note || "",
  };
}

export default function ActionBoardPage() {
  const [parsedPlan, setParsedPlan] = useState([]);
  const [taskStatus, setTaskStatus] = useState({});
  const [planMeta, setPlanMeta] = useState({});
  const [dayNotes, setDayNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedPlan = JSON.parse(localStorage.getItem("study-tracker-parsed-plan") || "[]");
    const normalized = savedPlan.map((day) => ({
      ...day,
      tasks: (day.tasks || []).map((task, idx) => normalizeTask(task, idx + 1)),
    }));
    setParsedPlan(normalized);
    setTaskStatus(JSON.parse(localStorage.getItem("study-tracker-task-status") || "{}"));
    setPlanMeta(JSON.parse(localStorage.getItem("study-tracker-plan-meta") || "{}"));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("study-tracker-task-status", JSON.stringify(taskStatus));
  }, [taskStatus, hydrated]);

  const currentDay = getCurrentPlanDay(planMeta, parsedPlan.length);

  useEffect(() => {
    const notesMap = JSON.parse(localStorage.getItem("study-day-notes") || "{}");
    setDayNotes(notesMap[currentDay] || "");
  }, [currentDay]);

  function saveDayNote(value) {
    setDayNotes(value);
    const notesMap = JSON.parse(localStorage.getItem("study-day-notes") || "{}");
    notesMap[currentDay] = value;
    localStorage.setItem("study-day-notes", JSON.stringify(notesMap));
  }

  function toggleTask(day, taskIndex) {
    const key = `${day}-${taskIndex}`;
    setTaskStatus((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const totalTasks = useMemo(
    () => parsedPlan.reduce((sum, day) => sum + (day.tasks?.length || 0), 0),
    [parsedPlan]
  );

  const doneCount = useMemo(() => Object.values(taskStatus).filter(Boolean).length, [taskStatus]);
  const progressPct = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

  const todaysTasks = useMemo(() => {
    const current = parsedPlan.find((d) => d.day === currentDay);
    return current ? current.tasks.map((task, idx) => ({ day: current.day, idx, ...task })) : [];
  }, [parsedPlan, currentDay]);

  const carryOverTasks = useMemo(() => {
    const carry = [];
    parsedPlan
      .filter((day) => day.day < currentDay && day.day >= currentDay - 3)
      .forEach((day) => {
        day.tasks.forEach((task, idx) => {
          const key = `${day.day}-${idx}`;
          if (!taskStatus[key]) {
            carry.push({ day: day.day, idx, ...task });
          }
        });
      });
    return carry;
  }, [parsedPlan, currentDay, taskStatus]);

  function markAllTodayDone() {
    const updates = {};
    todaysTasks.forEach((task) => {
      updates[`${task.day}-${task.idx}`] = true;
    });
    setTaskStatus((prev) => ({ ...prev, ...updates }));
  }

  function resetAllCheckmarks() {
    const ok = window.confirm("Reset all task checkmarks for this active plan?");
    if (!ok) return;
    setTaskStatus({});
  }

  function clearCurrentDayNote() {
    const ok = window.confirm("Clear note for this day?");
    if (!ok) return;
    const notesMap = JSON.parse(localStorage.getItem("study-day-notes") || "{}");
    delete notesMap[currentDay];
    localStorage.setItem("study-day-notes", JSON.stringify(notesMap));
    setDayNotes("");
  }

  if (parsedPlan.length === 0) {
    return (
      <div className="grid">
        <div className="card col-12 page-card">
          <h1>Action Board</h1>
          <p className="helper">No active plan yet. Load one from Plan Studio first.</p>
          <div className="onboard-steps">
            <p><strong>Step 1:</strong> Open Plan Studio</p>
            <p><strong>Step 2:</strong> Parse and preview your plan</p>
            <p><strong>Step 3:</strong> Save as active plan</p>
          </div>
          <Link className="btn btn-primary" to="/plan-studio">Go to Plan Studio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card col-12 page-card">
        <div className="section-head">
          <div>
            <h1>Action Board</h1>
            <p className="helper">Day {currentDay} of {parsedPlan.length}</p>
          </div>
          <button className="btn btn-danger" type="button" onClick={resetAllCheckmarks}>
            Reset All Checkmarks
          </button>
        </div>
        <p className="progress-text">{progressPct}% complete</p>
        <div className="progress-wrap progress-strong">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="card col-8">
        <div className="section-head">
          <h2>Today Tasks</h2>
          <button className="btn" type="button" onClick={markAllTodayDone}>Mark all done</button>
        </div>

        {todaysTasks.length === 0 ? (
          <p className="helper">No tasks available for current day.</p>
        ) : (
          todaysTasks.map((item) => {
            const key = `${item.day}-${item.idx}`;
            const isDone = Boolean(taskStatus[key]);
            return (
              <div key={key} className={`task-card ${isDone ? "done" : ""}`}>
                <label className={`task-item ${isDone ? "done" : ""}`}>
                  <input type="checkbox" checked={isDone} onChange={() => toggleTask(item.day, item.idx)} />
                  <span>{item.title}</span>
                </label>
                <div className="task-meta">
                  <span className="pill">{item.difficulty}</span>
                  <span className="pill">{item.estimate}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card col-4">
        <h2>Carry-Over (Last 3 Days)</h2>
        {carryOverTasks.length === 0 ? (
          <p className="helper">No carry-over tasks. Great consistency.</p>
        ) : (
          carryOverTasks.map((item) => {
            const key = `${item.day}-${item.idx}`;
            const isDone = Boolean(taskStatus[key]);
            return (
              <label key={key} className={`task-item ${isDone ? "done" : ""}`}>
                <input type="checkbox" checked={isDone} onChange={() => toggleTask(item.day, item.idx)} />
                <span>Day {item.day}: {item.title}</span>
              </label>
            );
          })
        )}
      </div>

      <div className="card col-12">
        <div className="section-head">
          <h2>Day Notes</h2>
          <button className="btn btn-danger" type="button" onClick={clearCurrentDayNote}>
            Clear Day Note
          </button>
        </div>
        <input
          className="input"
          value={dayNotes}
          onChange={(e) => saveDayNote(e.target.value)}
          placeholder="What was hard today? What will you improve tomorrow?"
        />
      </div>
    </div>
  );
}
