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

function fmt(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

const STATUS_OPTIONS = ["pending", "accepted", "declined", "cancelled", "completed"];
const SCHEDULE_OPTIONS = ["", "none", "proposed", "confirmed"];

export default function AdminSessions() {
    const [q, setQ] = useState("");
    const qDebounced = useDebounced(q, 300);

    const [status, setStatus] = useState("");
    const [scheduleStatus, setScheduleStatus] = useState("");

    const [page, setPage] = useState(1);
    const pageSize = 20;

    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState({ page: 1, pageSize, total: 0, totalPages: 1 });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [savingId, setSavingId] = useState(null);

    useEffect(() => setPage(1), [qDebounced, status, scheduleStatus]);

    const qs = useMemo(() => {
        const p = new URLSearchParams();
        if (qDebounced.trim()) p.set("q", qDebounced.trim());
        if (status) p.set("status", status);
        if (scheduleStatus) p.set("scheduleStatus", scheduleStatus);
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        return p.toString();
    }, [qDebounced, status, scheduleStatus, page]);

    async function load() {
        setLoading(true);
        setError("");
        try {
            const data = await api(`/admin/sessions?${qs}`);
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

    async function forceStatus(row, nextStatus) {
        const ok = confirm(`Force session #${row.id} status → "${nextStatus}"?`);
        if (!ok) return;

        setActionError("");
        setSavingId(row.id);
        try {
            await api(`/admin/sessions/${row.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: nextStatus }),
            });

            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)));
        } catch (e) {
            setActionError(e.message);
        } finally {
            setSavingId(null);
        }
    }

    const canPrev = meta.page > 1;
    const canNext = meta.page < meta.totalPages;

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Sessions</h1>
                    <p className="mt-1 text-slate-600">
                        Moderate session requests across the platform (status, scheduling info, participants).
                    </p>
                </div>

                {!loading && (
                    <div className="text-sm text-slate-600">
                        {meta.total} request{meta.total === 1 ? "" : "s"}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="mt-6 grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Search</label>
                    <input
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        placeholder="Search message or IDs (session/user/skill)…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <select
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="">All</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-700">Schedule</label>
                    <select
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        value={scheduleStatus}
                        onChange={(e) => setScheduleStatus(e.target.value)}
                    >
                        <option value="">All</option>
                        {SCHEDULE_OPTIONS.filter(Boolean).map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            <InlineError message={error} />
            <InlineError message={actionError} />

            {loading ? (
                <div className="mt-6 text-slate-600">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed p-6 text-slate-600">
                    No session requests found.
                </div>
            ) : (
                <div className="mt-6 rounded-xl border bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-[1100px] w-full text-left text-sm">

                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-4 py-3">Request</th>
                                    <th className="px-4 py-3">Participants</th>
                                    <th className="px-4 py-3">Skill</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Schedule</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {rows.map((r) => (
                                    <tr key={r.id} className="align-top">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900">#{r.id}</div>
                                            <div className="text-xs text-slate-500">Created: {fmt(r.created_at)}</div>
                                            {r.message ? (
                                                <div className="mt-2 text-xs text-slate-700 whitespace-pre-wrap">
                                                    {r.message}
                                                </div>
                                            ) : (
                                                <div className="mt-2 text-xs text-slate-400">No message</div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="text-xs text-slate-500">Requester</div>
                                            <div className="font-medium text-slate-900">
                                                {r.requester?.name || `User #${r.requester_id}`}
                                            </div>
                                            <div className="text-xs text-slate-500">{r.requester?.email || ""}</div>

                                            <div className="mt-3 text-xs text-slate-500">Provider</div>
                                            <div className="font-medium text-slate-900">
                                                {r.provider?.name || `User #${r.provider_id}`}
                                            </div>
                                            <div className="text-xs text-slate-500">{r.provider?.email || ""}</div>
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900">
                                                {r.skill?.title || `Skill #${r.skill_id}`}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {r.skill?.type ? `${r.skill.type} • ` : ""}{r.skill?.visibility || ""}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-slate-50 text-slate-700 border-slate-200">
                                                {r.status}
                                            </span>
                                            {r.responded_at && (
                                                <div className="mt-2 text-xs text-slate-500">Updated: {fmt(r.responded_at)}</div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="text-xs text-slate-500">Schedule status</div>
                                            <div className="font-medium text-slate-900">{r.schedule_status || "—"}</div>

                                            {r.scheduled_start && r.scheduled_end ? (
                                                <div className="mt-2 text-xs text-slate-700">
                                                    {fmt(r.scheduled_start)} → {fmt(r.scheduled_end)}
                                                    <div className="text-slate-500">{r.timezone || ""}</div>
                                                </div>
                                            ) : (
                                                <div className="mt-2 text-xs text-slate-400">Not scheduled</div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            <div className="flex flex-col items-end gap-2">
                                                <select
                                                    className="rounded-md border px-2 py-1 text-xs"
                                                    disabled={savingId === r.id}
                                                    defaultValue=""
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        if (!v) return;
                                                        forceStatus(r, v);
                                                        e.target.value = "";
                                                    }}
                                                >
                                                    <option value="">Force status…</option>
                                                    {STATUS_OPTIONS.map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>

                                                <div className="text-xs text-slate-400">
                                                    {savingId === r.id ? "Saving…" : ""}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
