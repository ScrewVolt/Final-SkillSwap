const API_BASE = "http://localhost:5000";

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  // Always read text first, then try JSON
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    // Your global handler returns: { error, message, status }
    const msg =
      (data && (data.message || data.error || data.msg)) ||
      `Request failed (${res.status})`;

    if (res.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    throw new Error(msg);
  }

  return data;
}
