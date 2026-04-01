import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { deleteDailyReport, getDailyReports, getDsaStreak, getStreak, saveDailyReport } from "../api";
import { showToast } from "../utils/toast";

function getDateThreshold(range) {
  const now = new Date();
  if (range === "week") {
    const day = now.getDay();
    const offset = day === 0 ? 6 : day - 1;
    now.setDate(now.getDate() - offset);
    return now.toISOString().slice(0, 10);
  }
  if (range === "month") {
    now.setDate(1);
    return now.toISOString().slice(0, 10);
  }
  return "";
}

function toCsv(rows) {
  const headers = ["Date", "DSA", "Count", "Hours", "Mood", "OOPS", "CN", "Technologies", "Notes"];
  const csvRows = [headers.join(",")];
  rows.forEach((r) => {
    const values = [
      r.date,
      r.dsa_topic,
      r.dsa_problems_solved,
      r.study_hours,
      r.mood,
      r.oops_topic,
      r.cn_topic,
      r.technologies_learned,
      r.problems_learned_today,
    ].map((value) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`);
    csvRows.push(values.join(","));
  });
  return csvRows.join("\n");
}

export default function EntriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState([]);
  const [streak, setStreak] = useState(0);
  const [dsaStreak, setDsaStreak] = useState(0);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [openNotesDate, setOpenNotesDate] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState(new Date().toISOString().slice(0, 10));
  const [composerText, setComposerText] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setError("");
      const [reportData, streakData, dsaStreakData] = await Promise.all([
        getDailyReports(),
        getStreak(),
        getDsaStreak(),
      ]);
      setReports(reportData);
      setStreak(streakData.streak || 0);
      setDsaStreak(dsaStreakData.dsa_streak || 0);
    } catch (err) {
      setError(err.message || "Failed to load reports");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const shouldOpenComposer = searchParams.get("new") === "1";
    if (shouldOpenComposer) {
      setIsComposerOpen(true);
      setOpenNotesDate("");
    }
  }, [searchParams]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    const threshold = getDateThreshold(timeFilter);

    return reports.filter((report) => {
      if (threshold && report.date < threshold) return false;

      if (!query) return true;
      return [
        report.date,
        report.dsa_topic,
        report.oops_topic,
        report.cn_topic,
        report.other_topics,
        report.technologies_learned,
        report.problems_learned_today,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [reports, search, timeFilter]);

  async function handleDelete(dateValue) {
    const ok = window.confirm(`Delete entry for ${dateValue}?`);
    if (!ok) return;

    try {
      await deleteDailyReport(dateValue);
      showToast(`Deleted ${dateValue}`);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  }

  function openComposerForDate(dateValue = "") {
    setComposerDate(dateValue || new Date().toISOString().slice(0, 10));
    setComposerText("");
    setIsComposerOpen(true);
  }

  function closeComposer() {
    setIsComposerOpen(false);
    setComposerText("");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("new");
    setSearchParams(nextParams, { replace: true });
  }

  async function handleSaveNote() {
    if (!composerDate) {
      setError("Please choose a date for this note");
      return;
    }

    const existingReport = reports.find((report) => report.date === composerDate);
    const payload = {
      report_date: composerDate,
      dsa_topic: existingReport?.dsa_topic || "",
      dsa_problems_solved: existingReport?.dsa_problems_solved || 0,
      study_hours: existingReport?.study_hours || 0,
      oops_topic: existingReport?.oops_topic || "",
      cn_topic: existingReport?.cn_topic || "",
      other_topics: existingReport?.other_topics || "",
      technologies_learned: existingReport?.technologies_learned || "",
      mood: existingReport?.mood || "😐",
      problems_learned_today: composerText.trim(),
    };

    try {
      setError("");
      await saveDailyReport(payload);
      showToast(existingReport ? `Updated note for ${composerDate}` : `Saved note for ${composerDate}`);
      closeComposer();
      await loadData();
      setOpenNotesDate(composerDate);
    } catch (err) {
      setError(err.message || "Failed to save note");
    }
  }

  function handleExport() {
    const csv = toCsv(filteredReports);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "progress-log.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid">
      <div className="card col-4 hero-stat"><strong>{streak}</strong><span>Study Streak</span></div>
      <div className="card col-4 hero-stat"><strong>{dsaStreak}</strong><span>DSA Streak</span></div>
      <div className="card col-4 hero-stat"><strong>{reports.length}</strong><span>Tracked Days</span></div>

      <div className="card col-12">
        <div className="section-head">
          <div>
            <h1>Progress Log</h1>
            <p className="helper">Readable, airy table with quick filtering and safe delete actions.</p>
          </div>
          <div className="section-actions">
            <button className="btn" type="button" onClick={() => openComposerForDate()}>New Note</button>
            <button className="btn" type="button" onClick={handleExport}>Export CSV</button>
          </div>
        </div>

        {isComposerOpen ? (
          <div className="card" style={{ marginBottom: 14 }}>
            <h2 style={{ marginTop: 0 }}>New Note</h2>
            <div className="filters-grid">
              <label>
                <span>Date</span>
                <input
                  className="input"
                  type="date"
                  value={composerDate}
                  onChange={(e) => setComposerDate(e.target.value)}
                />
              </label>
            </div>
            <label>
              <span>Notes</span>
              <textarea
                className="textarea"
                rows={5}
                placeholder="Write what you learned today"
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
              />
            </label>
            <div className="actions-row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" type="button" onClick={handleSaveNote}>Save Note</button>
              <button className="btn" type="button" onClick={closeComposer}>Cancel</button>
            </div>
          </div>
        ) : null}

        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by topic, notes, tech, or date"
        />

        <div className="chip-row">
          <button className={`chip ${timeFilter === "week" ? "active" : ""}`} onClick={() => setTimeFilter("week")}>This week</button>
          <button className={`chip ${timeFilter === "month" ? "active" : ""}`} onClick={() => setTimeFilter("month")}>This month</button>
          <button className={`chip ${timeFilter === "all" ? "active" : ""}`} onClick={() => setTimeFilter("all")}>All time</button>
        </div>

        {error ? <p className="error">{error}</p> : null}

        {filteredReports.length === 0 ? (
          <div className="empty-state">
            <p>No entries found.</p>
            <Link className="btn btn-primary" to="/topics-tracker">Go to Topics Tracker</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="progress-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>DSA</th>
                  <th>Count</th>
                  <th>Hours</th>
                  <th>Mood</th>
                  <th>OOPS</th>
                  <th>CN</th>
                  <th>Technologies</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report._id}>
                    <td>{report.date}</td>
                    <td><span className="status-pip pip-dsa" />{report.dsa_topic || "-"}</td>
                    <td>{report.dsa_problems_solved}</td>
                    <td>{report.study_hours || 0}</td>
                    <td>{report.mood || "Steady"}</td>
                    <td><span className="status-pip pip-oops" />{report.oops_topic || "-"}</td>
                    <td><span className="status-pip pip-cn" />{report.cn_topic || "-"}</td>
                    <td>{report.technologies_learned || "-"}</td>
                    <td>
                      <button className="btn btn-danger" type="button" onClick={() => handleDelete(report.date)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card col-12">
        <h2>Notes by Date</h2>
        {filteredReports.map((report) => {
          const isOpen = openNotesDate === report.date;
          return (
            <div key={`notes-${report._id}`} className="notes-item">
              <button type="button" className="notes-toggle" onClick={() => setOpenNotesDate(isOpen ? "" : report.date)}>
                {report.date} {isOpen ? "-" : "+"}
              </button>
              <div className="actions-row" style={{ marginBottom: 8 }}>
                <button className="btn" type="button" onClick={() => openComposerForDate(report.date)}>Edit Note</button>
              </div>
              {isOpen ? <div className="notes-body"><p>{report.problems_learned_today || "No notes for this date."}</p></div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
