import { useEffect, useState } from "react";
import { api } from "../api/http";
import InlineError from "../components/InLineError";

function Badge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  const map = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    declined: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-slate-50 text-slate-700 border-slate-200",
    completed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  const s = (status || "pending").toLowerCase();
  return <span className={`${base} ${map[s] || map.pending}`}>{s}</span>;
}

function ScheduleBadge({ status }) {
  const s = (status || "none").toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  const map = {
    none: "bg-slate-50 text-slate-700 border-slate-200",
    proposed: "bg-sky-50 text-sky-700 border-sky-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return <span className={`${base} ${map[s] || map.none}`}>{s}</span>;
}

function formatRange(start, end, tz) {
  if (!start || !end) return "";
  try {
    const s = new Date(start).toLocaleString();
    const e = new Date(end).toLocaleString();
    return `${s} → ${e}${tz ? ` (${tz})` : ""}`;
  } catch {
    return `${start} → ${end}${tz ? ` (${tz})` : ""}`;
  }
}

/* --------------------------- Scheduling Panel --------------------------- */

function SchedulingPanel({ r, tab, onUpdated }) {
  const scheduleStatus = (r.schedule_status || "none").toLowerCase();
  const hasTime = !!(r.scheduled_start && r.scheduled_end);

  const [slots, setSlots] = useState([]);
  const [picked, setPicked] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadSlots() {
    setErr("");
    setLoadingSlots(true);
    try {
      const data = await api(`/sessions/${r.id}/availability`);
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function propose() {
    setErr("");
    setBusy(true);
    try {
      if (!picked) throw new Error("Pick an availability slot first.");

      await api(`/sessions/${r.id}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          action: "propose",
          slot_id: Number(picked),
        }),
      });

      setPicked("");
      setSlots([]);
      await onUpdated?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setErr("");
    setBusy(true);
    try {
      await api(`/sessions/${r.id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ action: "confirm" }),
      });
      await onUpdated?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function clearSchedule() {
    setErr("");
    setBusy(true);
    try {
      await api(`/sessions/${r.id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ action: "clear" }),
      });
      setPicked("");
      setSlots([]);
      await onUpdated?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const canRequesterPropose =
    tab === "made" && r.status === "accepted" && scheduleStatus !== "confirmed";

  const canProviderConfirm =
    tab === "received" &&
    r.status === "accepted" &&
    scheduleStatus === "proposed" &&
    hasTime;

  const canClear =
    r.status === "accepted" &&
    scheduleStatus !== "none" &&
    (hasTime || scheduleStatus === "proposed");

  return (
    <div className="mt-4 rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Scheduling</span>
            <ScheduleBadge status={scheduleStatus} />
          </div>

          <div className="mt-1 text-sm text-slate-700">
            {hasTime ? (
              <span className="font-medium">
                {formatRange(r.scheduled_start, r.scheduled_end, r.timezone)}
              </span>
            ) : (
              <span className="text-slate-500">No time selected yet.</span>
            )}
          </div>
        </div>

        {canClear && (
          <button
            onClick={clearSchedule}
            disabled={busy}
            className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy ? "Working…" : "Clear"}
          </button>
        )}
      </div>

      {/* Requester proposes */}
      {canRequesterPropose && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadSlots}
              disabled={loadingSlots || busy}
              className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingSlots ? "Loading…" : "Load provider availability"}
            </button>
            <span className="text-xs text-slate-500">Pick a slot and propose it.</span>
          </div>

          {slots.length > 0 && (
            <div className="mt-3 grid gap-2">
              <select
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                disabled={busy}
              >
                <option value="">Select a slot…</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatRange(s.start_time, s.end_time, s.timezone)}
                  </option>
                ))}
              </select>

              <button
                onClick={propose}
                disabled={!picked || busy}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Proposing…" : "Propose time"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Provider confirms */}
      {canProviderConfirm && (
        <div className="mt-4">
          <button
            onClick={confirm}
            disabled={busy}
            className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Confirming…" : "Confirm scheduled time"}
          </button>
        </div>
      )}

      {err && (
        <div className="mt-3">
          <InlineError message={err} />
        </div>
      )}

      {r.status !== "accepted" && (
        <div className="mt-3 text-xs text-slate-500">
          Scheduling unlocks after the session is{" "}
          <span className="font-medium">accepted</span>.
        </div>
      )}
    </div>
  );
}

/* --------------------------- Feedback Panel --------------------------- */

function StarPicker({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-md border text-sm font-semibold ${
            value >= n
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700"
          } disabled:opacity-60`}
          title={`${n} star${n > 1 ? "s" : ""}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function FeedbackPanel({ r, myUserId, onSubmitted }) {
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function loadExisting() {
    if (!myUserId) return;
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const rows = await api(`/reviews/session/${r.id}`);
      const mine = Array.isArray(rows)
        ? rows.find((x) => Number(x.from_user_id) === Number(myUserId))
        : null;
      setExisting(mine || null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (r.status === "completed" && myUserId) loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.id, r.status, myUserId]);

  async function submit() {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      if (!rating) throw new Error("Select a rating (1–5).");

      await api("/reviews", {
        method: "POST",
        body: JSON.stringify({
          session_request_id: r.id,
          rating,
          comment,
        }),
      });

      setOk("Feedback submitted. Thank you!");
      setRating(0);
      setComment("");
      await loadExisting();
      await onSubmitted?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (r.status !== "completed") return null;

  return (
    <div className="mt-4 rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Feedback</div>
          <div className="mt-1 text-xs text-slate-500">
            Leave a rating and optional comment for the other participant.
          </div>
        </div>
        {loading && <div className="text-xs text-slate-500">Loading…</div>}
      </div>

      {existing ? (
        <div className="mt-3 rounded-lg border bg-slate-50 p-3">
          <div className="text-sm text-slate-900">
            You already left feedback:{" "}
            <span className="font-semibold">{existing.rating}/5</span>
          </div>
          {existing.comment && (
            <div className="mt-1 text-sm text-slate-700">“{existing.comment}”</div>
          )}
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          <StarPicker value={rating} onChange={setRating} disabled={busy} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={busy}
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Optional comment…"
          />
          <button
            onClick={submit}
            disabled={busy || !rating}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit feedback"}
          </button>
        </div>
      )}

      {err && (
        <div className="mt-3">
          <InlineError message={err} />
        </div>
      )}
      {ok && <div className="mt-3 text-sm text-emerald-700">{ok}</div>}
    </div>
  );
}

/* ------------------------------- Page ------------------------------- */

export default function Sessions() {
  const [tab, setTab] = useState("made"); // made | received
  const [data, setData] = useState({ made: [], received: [] });

  const [me, setMe] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load(signal) {
    setError("");
    setLoading(true);
    try {
      const res = await api("/sessions/mine", { signal });
      // Safety: ensure shape
      setData({
        made: Array.isArray(res?.made) ? res.made : [],
        received: Array.isArray(res?.received) ? res.received : [],
      });
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function respond(id, action) {
    setActionError("");
    setBusyId(id);
    try {
      await api(`/sessions/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  // Load current user (for review ownership)
  useEffect(() => {
    (async () => {
      try {
        const m = await api("/auth/me");
        // supports either {id:..} or {user:{id:..}}
        const normalized = m?.user ? m.user : m;
        setMe(normalized || null);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = tab === "made" ? data.made : data.received;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Sessions</h1>
          <p className="mt-1 text-slate-600">
            Track requests you made and requests sent to you.
          </p>
        </div>
        <button
          onClick={() => load()}
          className="rounded-md border px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab("made")}
          className={`rounded-md px-4 py-2 text-sm border ${
            tab === "made"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700"
          }`}
        >
          Requests I Made ({data.made.length})
        </button>
        <button
          onClick={() => setTab("received")}
          className={`rounded-md px-4 py-2 text-sm border ${
            tab === "received"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700"
          }`}
        >
          Requests To Me ({data.received.length})
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <InlineError message={error} />
        <InlineError message={actionError} />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="text-slate-600">Loading sessions…</div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border p-6 text-slate-600">
            No sessions found for this tab.
          </div>
        ) : (
          <div className="grid gap-4">
            {list.map((r) => (
              <div key={r.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge status={r.status} />
                      <span className="text-xs text-slate-500">#{r.id}</span>
                    </div>

                    <h2 className="mt-2 font-semibold text-slate-900">
                      {r.skill_title || `Skill #${r.skill_id}`}
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">
                        Requester:
                      </span>{" "}
                      {r.requester_name || r.requester_id}
                      <span className="mx-2 text-slate-300">•</span>
                      <span className="font-medium text-slate-700">Provider:</span>{" "}
                      {r.provider_name || r.provider_id}
                    </p>

                    {r.message && (
                      <p className="mt-2 text-sm text-slate-700">“{r.message}”</p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                      Created: {new Date(r.created_at).toLocaleString()}
                      {r.responded_at
                        ? ` • Updated: ${new Date(r.responded_at).toLocaleString()}`
                        : ""}
                    </p>

                    <SchedulingPanel r={r} tab={tab} onUpdated={() => load()} />

                    {/* ✅ Feedback (only when completed) */}
                    <FeedbackPanel
                      r={r}
                      myUserId={me?.id}
                      onSubmitted={() => load()}
                    />
                  </div>

                  <div className="flex min-w-[170px] flex-col gap-2">
                    {tab === "received" && r.status === "pending" && (
                      <>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => respond(r.id, "accept")}
                          className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
                        >
                          {busyId === r.id ? "Saving…" : "Accept"}
                        </button>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => respond(r.id, "decline")}
                          className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {busyId === r.id ? "Saving…" : "Decline"}
                        </button>
                      </>
                    )}

                    {tab === "made" &&
                      (r.status === "pending" || r.status === "accepted") && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => respond(r.id, "cancel")}
                          className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {busyId === r.id ? "Saving…" : "Cancel"}
                        </button>
                      )}

                    {r.status === "accepted" && (
                      <button
                        disabled={busyId === r.id}
                        onClick={() => respond(r.id, "complete")}
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {busyId === r.id ? "Saving…" : "Mark Completed"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
