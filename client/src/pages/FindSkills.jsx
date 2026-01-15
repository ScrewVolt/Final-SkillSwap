import { useEffect, useMemo, useState } from "react";
import InlineError from "../components/InLineError";
import { api } from "../api/http";


/* ----------------------------- small utilities ----------------------------- */

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function highlight(text, needle) {
  if (!needle || !text) return text;

  const full = String(text);
  const lower = full.toLowerCase();
  const n = String(needle).toLowerCase();

  const i = lower.indexOf(n);
  if (i === -1) return full;

  const before = full.slice(0, i);
  const match = full.slice(i, i + needle.length);
  const after = full.slice(i + needle.length);

  return (
    <>
      {before}
      <mark className="rounded bg-amber-100 px-1">{match}</mark>
      {after}
    </>
  );
}

function buildQuery({ q, type, tags, page, pageSize }) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (type) p.set("type", type);
  if (tags) p.set("tags", tags);
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  return p.toString();
}

function TagPills({ tags }) {
  if (!tags) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {String(tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6)
        .map((t, idx) => (
          <span
            key={`${t}-${idx}`}
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-slate-700 bg-slate-50"
          >
            {t}
          </span>
        ))}
    </div>
  );
}

/* -------------------------------- component ------------------------------ */

export default function FindSkills() {
  // Filters
  const [q, setQ] = useState("");
  const qDebounced = useDebounced(q, 300);
  const [type, setType] = useState(""); // "offer" | "seek" | ""
  const [tags, setTags] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Data
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize, total: 0, totalPages: 1 });

  // Load state
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");

  // Request modal
  const [requestOpen, setRequestOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const [requestMsg, setRequestMsg] = useState("");
  const [requestStatus, setRequestStatus] = useState("idle"); // idle | sending | error | success
  const [requestError, setRequestError] = useState("");

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [qDebounced, type, tags]);

  const queryString = useMemo(
    () =>
      buildQuery({
        q: qDebounced.trim(),
        type,
        tags: tags.trim(),
        page,
        pageSize,
      }),
    [qDebounced, type, tags, page]
  );

 // Load skills list
useEffect(() => {
  const controller = new AbortController();

  async function load() {
    setStatus("loading");
    setErrorMsg("");

    try {
      const data = await api(`/api/skills?${queryString}`, {
        signal: controller.signal,
      });

      setRows(data?.data || []);
      setMeta(data?.meta || { page: 1, pageSize, total: 0, totalPages: 1 });
      setStatus("idle");
    } catch (e) {
      if (e?.name === "AbortError") return;
      setStatus("error");
      setErrorMsg(e.message);
    }
  }

  load();
  return () => controller.abort();
}, [queryString]);


  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  function openRequestModal(skill) {
    setActiveSkill(skill);
    setRequestMsg("");
    setRequestError("");
    setRequestStatus("idle");
    setRequestOpen(true);
  }

  function closeRequestModal() {
    if (requestStatus === "sending") return;
    setRequestOpen(false);
    setActiveSkill(null);
  }

  async function submitRequest() {
    if (!activeSkill) return;
    if (requestStatus === "sending") return;

    setRequestStatus("sending");
    setRequestError("");

    try {
        await api("/sessions", {
            method: "POST",
            body: JSON.stringify({
              skill_id: activeSkill.id,
              message: requestMsg,
            }),
          });          

      setRequestStatus("success");

      setTimeout(() => {
        setRequestOpen(false);
        setActiveSkill(null);
        setRequestMsg("");
        setRequestStatus("idle");
      }, 700);
    } catch (e) {
      setRequestStatus("error");
      setRequestError(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Find Skills</h1>
          <p className="mt-1 text-slate-600">Search public skills to request a session.</p>
        </div>

        <div className="text-sm text-slate-600">
          {status !== "loading" ? (
            <span>
              {meta.total} result{meta.total === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="text-sm font-medium text-slate-700">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, description, tags…"
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          >
            <option value="">All types</option>
            <option value="offer">Offers</option>
            <option value="seek">Seeking</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Tag filter</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Ex: algebra"
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>
      </div>

      {/* Load state */}
      {status === "loading" && <div className="mt-4 text-slate-600">Loading…</div>}
      {status === "error" && <InlineError message={errorMsg} />}

      {/* Empty */}
      {status !== "loading" && rows.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed p-6 text-slate-600">
          <h3 className="font-semibold text-slate-900">No results</h3>
          <p className="mt-1">
            Try a different keyword, remove filters, or search a broader tag.
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((s) => (
          <div key={s.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold text-slate-900">{highlight(s.title, qDebounced)}</div>
              <span className="text-xs uppercase text-slate-500">{s.type}</span>
            </div>

            {s.description ? (
              <p className="mt-2 text-sm text-slate-600">{highlight(s.description, qDebounced)}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No description provided.</p>
            )}

            <TagPills tags={s.tags} />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">User #{s.user_id}</span>

              <button
                onClick={() => openRequestModal(s)}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:opacity-90"
              >
                Request Session
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
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

      {/* Request Modal */}
      {requestOpen && activeSkill && (
        <div
          onClick={closeRequestModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Request a Session</h2>
                <p className="mt-1 text-sm text-slate-600">
                  You’re requesting: <span className="font-medium">{activeSkill.title}</span>
                </p>
              </div>

              <button
                onClick={closeRequestModal}
                className="rounded-md border px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                disabled={requestStatus === "sending"}
              >
                ✕
              </button>
            </div>

            <InlineError message={requestStatus === "error" ? requestError : ""} />

            {requestStatus === "success" && (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Request sent!
              </div>
            )}

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700">Optional message</label>
              <textarea
                value={requestMsg}
                onChange={(e) => setRequestMsg(e.target.value)}
                placeholder="Example: I’m available after school. Could we meet for 30 minutes?"
                rows={4}
                className="mt-1 w-full rounded-md border px-3 py-2"
                disabled={requestStatus === "sending"}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeRequestModal}
                className="rounded-md border px-4 py-2 text-sm hover:bg-slate-50"
                disabled={requestStatus === "sending"}
              >
                Cancel
              </button>

              <button
                onClick={submitRequest}
                disabled={requestStatus === "sending"}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {requestStatus === "sending" ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
