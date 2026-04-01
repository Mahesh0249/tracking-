const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getAuthToken() {
  return localStorage.getItem("study-tracker-token") || "";
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.detail || "Request failed";
    const err = new Error(detail);
    err.status = response.status;
    throw err;
  }

  return data;
}

export async function addTopic(topic) {
  return apiFetch("/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
}

export async function getEntries() {
  return apiFetch("/entries");
}

export async function getStreak() {
  return apiFetch("/streak");
}

export async function parsePlan(rawText) {
  return apiFetch("/parse-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: rawText }),
  });
}

export async function generatePlan() {
  return apiFetch("/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export async function signup(name, email, password) {
  return apiFetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(email, password) {
  return apiFetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiFetch("/logout", { method: "POST" });
}

export async function getCurrentUser() {
  return apiFetch("/auth/me");
}

export async function saveDailyReport(payload) {
  return apiFetch("/daily-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getDailyReports() {
  return apiFetch("/daily-reports");
}

export async function deleteDailyReport(dateValue) {
  return apiFetch(`/daily-report/${encodeURIComponent(dateValue)}`, {
    method: "DELETE",
  });
}

export async function getDsaStreak() {
  return apiFetch("/dsa-streak");
}

export async function getProfileSummary() {
  return apiFetch("/profile-summary");
}

export async function getProfileSettings() {
  return apiFetch("/profile-settings");
}

export async function saveProfileSettings(payload) {
  return apiFetch("/profile-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

}

export async function saveActionBoardProgress(payload) {
  return apiFetch("/action-board/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getActionBoardProgress() {
  return apiFetch("/action-board/progress");
}

export async function getAdminOverview() {
  return apiFetch("/admin/overview");
}
