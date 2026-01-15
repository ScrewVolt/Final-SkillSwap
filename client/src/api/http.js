const RAW_BASE = import.meta.env.VITE_API_URL;

// Normalize base once (no trailing slash)
const BASE_URL = (RAW_BASE || "").replace(/\/+$/, "");

// Normalize paths (ensure leading slash)
function normPath(path) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export async function api(path, options = {}) {
  if (!BASE_URL) {
    throw new Error(
      "VITE_API_URL is not set. Add it in Render for the frontend and redeploy."
    );
  }

  const url = `${BASE_URL}${normPath(path)}`;

  const headers = options.headers || {};
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(
      data?.msg || data?.error || data?.message || `Request failed (${res.status})`
    );
  }

  return data;
}
