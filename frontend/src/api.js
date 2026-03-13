// api.js — Django DRF API client
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || err.detail || "API error");
  }
  return res.json();
}

export const api = {
  chat: (message, feature = "general", sessionId = null, sessionKey = "anonymous") =>
    request("/chat/", {
      method: "POST",
      body: JSON.stringify({
        message,
        feature,
        session_id: sessionId,
        session_key: sessionKey,
      }),
    }),
  getSessions: (feature) =>
    request(`/sessions/${feature ? `?feature=${feature}` : ""}`),
  getSession:    (id) => request(`/sessions/${id}/`),
  deleteSession: (id) => request(`/sessions/${id}/`, { method: "DELETE" }),
  health:        ()   => request("/health/"),
};