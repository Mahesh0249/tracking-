const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function addTopic(topic) {
  const response = await fetch(`${BASE_URL}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    throw new Error("Failed to add topic");
  }

  return response.json();
}

export async function getEntries() {
  const response = await fetch(`${BASE_URL}/entries`);

  if (!response.ok) {
    throw new Error("Failed to fetch entries");
  }

  return response.json();
}

export async function getStreak() {
  const response = await fetch(`${BASE_URL}/streak`);

  if (!response.ok) {
    throw new Error("Failed to fetch streak");
  }

  return response.json();
}

export async function parsePlan(rawText) {
  const response = await fetch(`${BASE_URL}/parse-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: rawText }),
  });

  if (!response.ok) {
    throw new Error("Failed to parse plan");
  }

  return response.json();
}

export async function generatePlan() {
  const response = await fetch(`${BASE_URL}/generate-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to generate plan");
  }

  return data;
}

export async function signup(name, email, password) {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Signup failed");
  }

  return data;
}

export async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Login failed");
  }

  return data;
}

export async function saveDailyReport(payload) {
  const response = await fetch(`${BASE_URL}/daily-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to save daily report");
  }

  return data;
}

export async function getDailyReports() {
  const response = await fetch(`${BASE_URL}/daily-reports`);

  if (!response.ok) {
    throw new Error("Failed to fetch daily reports");
  }

  return response.json();
}

export async function deleteDailyReport(dateValue) {
  const response = await fetch(`${BASE_URL}/daily-report/${encodeURIComponent(dateValue)}`, {
    method: "DELETE",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to delete entry");
  }
  return data;
}

export async function getDsaStreak() {
  const response = await fetch(`${BASE_URL}/dsa-streak`);

  if (!response.ok) {
    throw new Error("Failed to fetch DSA streak");
  }

  return response.json();
}

export async function getProfileSummary() {
  const response = await fetch(`${BASE_URL}/profile-summary`);

  if (!response.ok) {
    throw new Error("Failed to fetch profile summary");
  }

  return response.json();
}

export async function getProfileSettings(email) {
  const response = await fetch(`${BASE_URL}/profile-settings?email=${encodeURIComponent(email)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch profile settings");
  }

  return data;
}

export async function saveProfileSettings(payload) {
  const response = await fetch(`${BASE_URL}/profile-settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to save profile settings");
  }

  return data;
}
