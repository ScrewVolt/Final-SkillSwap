import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import InlineError from "../components/InLineError"; // ✅ make sure file name matches exactly

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

export default function AdminUsers() {
    const [q, setQ] = useState("");
    const qDebounced = useDebounced(q, 300);
    const [role, setRole] = useState(""); // "" | admin | student

    const [page, setPage] = useState(1);
    const pageSize = 20;

    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState({ page: 1, pageSize, total: 0, totalPages: 1 });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [savingId, setSavingId] = useState(null);

    useEffect(() => setPage(1), [qDebounced, role]);

    const qs = useMemo(() => {
        const p = new URLSearchParams();
        if (qDebounced.trim()) p.set("q", qDebounced.trim());
        if (role) p.set("role", role);
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        return p.toString();
    }, [qDebounced, role, page]);

    async function load() {
        setLoading(true);
        setError("");
        try {
            const data = await api(`/admin/users?${qs}`);
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

    async function setUserRole(user, nextRole) {
        const ok = confirm(`Change role for ${user.email} to "${nextRole}"?`);
        if (!ok) return;

        setActionError("");
        setSavingId(user.id);
        try {
            await api(`/admin/users/${user.id}/role`, {
                method: "PATCH",
                body: JSON.stringify({ role: nextRole }),
            });

            setRows((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
            );
        } catch (e) {
            setActionError(e.message);
        } finally {
            setSavingId(null);
        }
    }

    async function setUserActive(user, nextActive) {
        const label = nextActive ? "reactivate" : "deactivate";
        const ok = confirm(`Are you sure you want to ${label} ${user.email}?`);
        if (!ok) return;

        setActionError("");
        setSavingId(user.id);
        try {
            await api(`/admin/users/${user.id}/active`, {
                method: "PATCH",
                body: JSON.stringify({ is_active: nextActive }),
            });

            setRows((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, is_active: nextActive } : u))
            );
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
                    <h1 className="text-2xl font-bold text-slate-900">Admin Users</h1>
                    <p className="mt-1 text-slate-600">
                        Search users, control roles, and activate/deactivate accounts.
                    </p>
                </div>

                {!loading && (
                    <div className="text-sm text-slate-600">
                        {meta.total} user{meta.total === 1 ? "" : "s"}
                    </div>
                )}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Search</label>
                    <input
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        placeholder="Search name, email, or id…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-700">Role</label>
                    <select
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="">All</option>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                <InlineError message={error} />
                <InlineError message={actionError} />
            </div>

            {loading ? (
                <div className="mt-6 text-slate-600">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed p-6 text-slate-600">
                    No users found.
                </div>
            ) : (
                <div className="mt-6 rounded-xl border bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-[900px] w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">Request</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Participants</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Skill</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Schedule</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {rows.map((u) => {
                                    const active = u.is_active !== false; // default true if missing
                                    const busy = savingId === u.id;

                                    return (
                                        <tr key={u.id} className={!active ? "bg-slate-50/40" : ""}>
                                            <td className="px-4 py-3 min-w-[320px]">
                                                <div className="font-medium text-slate-900">{u.name}</div>
                                                <div className="text-xs text-slate-500">{u.email}</div>
                                                <div className="text-xs text-slate-400">ID: {u.id}</div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${u.role === "admin"
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : "bg-slate-50 text-slate-700 border-slate-200"
                                                        }`}
                                                >
                                                    {u.role}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${active
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-red-50 text-red-700 border-red-200"
                                                        }`}
                                                >
                                                    {active ? "active" : "deactivated"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-slate-600">{fmtDate(u.created_at)}</td>

                                            <td className="px-4 py-3">
                                                <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                                                    {/* Role toggle */}
                                                    {u.role === "admin" ? (
                                                        <button
                                                            disabled={busy}
                                                            onClick={() => setUserRole(u, "student")}
                                                            className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                                                        >
                                                            {busy ? "Saving…" : "Make student"}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={busy}
                                                            onClick={() => setUserRole(u, "admin")}
                                                            className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                                                        >
                                                            {busy ? "Saving…" : "Make admin"}
                                                        </button>
                                                    )}

                                                    {/* Active toggle */}
                                                    {active ? (
                                                        <button
                                                            disabled={busy}
                                                            onClick={() => setUserActive(u, false)}
                                                            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                        >
                                                            {busy ? "Saving…" : "Deactivate"}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={busy}
                                                            onClick={() => setUserActive(u, true)}
                                                            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                                        >
                                                            {busy ? "Saving…" : "Reactivate"}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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
