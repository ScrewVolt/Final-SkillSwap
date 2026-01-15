import { useEffect, useMemo, useState } from "react";
import InlineError from "../components/InLineError";
import { apiFetch } from "../lib/api";

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatSlot(start, end) {
  const s = new Date(start).toLocaleString();
  const e = new Date(end).toLocaleString();
  return `${s} → ${e}`;
}

export default function Availability() {
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  }, []);

  const defaultEnd = useMemo(() => {
    const d = new Date(defaultStart);
    d.setHours(d.getHours() + 1);
    return d;
  }, [defaultStart]);

  const [start, setStart] = useState(toLocalInputValue(defaultStart));
  const [end, setEnd] = useState(toLocalInputValue(defaultEnd));
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver"
  );

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/availability", { method: "GET" });
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createSlot(e) {
    e.preventDefault();
    if (saving) return;

    setError("");
    setSaving(true);

    try {
      await apiFetch("/availability", {
        method: "POST",
        body: JSON.stringify({
          start_time: start,
          end_time: end,
          timezone,
        }),
      });

      // reset defaults forward (optional nice UX)
      setStart(toLocalInputValue(defaultStart));
      setEnd(toLocalInputValue(defaultEnd));

      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot(id) {
    const ok = confirm("Delete this availability slot?");
    if (!ok) return;

    setError("");
    try {
      await apiFetch(`/availability/${id}`, { method: "DELETE" });
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
          <p className="mt-1 text-slate-600">
            Add time slots you’re available to host sessions. Requesters can propose times from these.
          </p>
        </div>
      </div>

      <InlineError message={error} />

      {/* Create slot card */}
      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-semibold text-slate-900">Add a slot</h2>

        <form onSubmit={createSlot} className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Timezone</label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/Denver"
              className="mt-1 w-full rounded-md border px-3 py-2"
              disabled={saving}
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Adding…" : "Add availability slot"}
            </button>
          </div>
        </form>
      </div>

      {/* Slots list */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your slots</h2>
          {!loading && (
            <span className="text-sm text-slate-600">
              {slots.length} slot{slots.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-4 text-slate-600">Loading…</div>
        ) : slots.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-slate-600">
            No availability yet. Add a slot above to get started.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {slots.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {formatSlot(s.start_time, s.end_time)}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{s.timezone}</div>
                </div>

                <button
                  onClick={() => deleteSlot(s.id)}
                  className="self-start rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:self-auto"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
