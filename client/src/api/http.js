const BASE_URL = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include", // ✅ send/receive cookies
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.msg || data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}
