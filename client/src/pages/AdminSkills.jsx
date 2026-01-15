import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import InlineError from "../components/InLineError";

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminSkills() {
  const [q, setQ] = useState("");
  const qDebounced = useDebounced(q, 300);

  const [type, setType] = useState(""); // "" | offer | seek

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Reset to page 1 when filters change
  useEffect(() => setPage(1), [qDebounced, type]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (qDebounced.trim()) p.set("q", qDebounced.trim());
    if (type) p.set("type", type);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  }, [qDebounced, type, page, pageSize]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/admin/skills?${qs}`);
      setRows(Array.isArray(data?.data) ? data.data : []);
      setMeta(data?.meta || { page: 1, pageSize, total: 0, totalPages: 1 });
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  async function onDelete(skill) {
    const ok = confirm(`Delete this skill?\n\n"${skill.title}"\n\nThis cannot be undone.`);
    if (!ok) return;

    setActionError("");
    setDeletingId(skill.id);

    try {
      await api(`/admin/skills/${skill.id}`, { method: "DELETE" });

      // If deleting last item on last page, pull back a page if needed
      const nextTotal = Math.max(0, (meta.total || 0) - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
      const nextPage = Math.min(page, nextTotalPages);

      if (nextPage !== page) setPage(nextPage);
      else await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Moderate Skills</h1>
          <p className="mt-1 text-slate-600">
            Admin view for searching and removing inappropriate skill listings.
          </p>
        </div>

        {!loading && (
          <div className="text-sm text-slate-600">
            {meta.total} result{meta.total === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Search</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="Search title, description, or tags…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Type</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All</option>
            <option value="offer">Offer</option>
            <option value="seek">Request</option>
          </select>
        </div>
      </div>

      <InlineError message={error} />
      <InlineError message={actionError} />

      {loading ? (
        <div className="mt-6 text-slate-600">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-6 text-slate-600">
          No skills found for these filters.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3">Skill</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{s.title}</div>
                    {s.description ? (
                      <div className="mt-1 text-slate-600 line-clamp-2">{s.description}</div>
                    ) : (
                      <div className="mt-1 text-slate-400">No description</div>
                    )}
                    {s.tags ? (
                      <div className="mt-2 text-xs text-slate-500">Tags: {s.tags}</div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-slate-900">{s.user?.name || `User #${s.user_id}`}</div>
                    <div className="text-xs text-slate-500">{s.user?.email || ""}</div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        s.type === "offer"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}
                    >
                      {s.type}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        s.visibility === "private"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {s.visibility}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-600">{fmtDate(s.created_at)}</td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDelete(s)}
                      disabled={deletingId === s.id}
                      className="rounded-md border px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            disabled={!canPrev}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Prev
          </button>

          <span className="text-sm text-slate-600">
            Page {meta.page} of {meta.totalPages}
          </span>

          <button
            disabled={!canNext}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
