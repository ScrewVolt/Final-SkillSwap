import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await api("/admin/reports");
        if (cancelled) return;
        setData(res);
        setUpdatedAt(new Date());
      } catch (e) {
        if (cancelled) return;
        setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const k = data?.kpis || {};
  const sessionsByStatus = data?.sessionsByStatus || {};
  const topTags = data?.topTags || [];

  // Build chart items (sorted desc)
  const statusItems = useMemo(() => {
    return Object.entries(sessionsByStatus)
      .map(([label, value]) => ({ label, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [sessionsByStatus]);

  const tagItems = useMemo(() => {
    return (topTags || [])
      .map((t) => ({ label: t.tag, value: Number(t.count) || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [topTags]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-slate-600">
        Loading reports…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Admin Reports</h1>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Reports</h1>
          <p className="mt-1 text-slate-600">
            Live platform metrics from the database (users, skills, sessions,
            notifications).
          </p>
          {updatedAt && (
            <p className="mt-1 text-xs text-slate-500">
              Last updated: {updatedAt.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total Users" value={k.totalUsers} />
        <KPI label="Total Skills" value={k.totalSkills} />
        <KPI label="Public Skills" value={k.publicSkills} />
        <KPI label="Private Skills" value={k.privateSkills} />
        <KPI label="Offers" value={k.offers} />
        <KPI label="Requests" value={k.seeks} />
        <KPI label="Session Requests" value={k.totalSessionRequests} />
        <KPI label="Unread Notifications" value={k.unreadNotifications} />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <BarList
          title="Sessions by Status"
          items={statusItems}
          valueLabel="sessions"
        />
        <BarList title="Top Skill Tags" items={tagItems} valueLabel="skills" />
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value ?? 0}</div>
    </div>
  );
}

function BarList({ title, items, valueLabel = "Count" }) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="rounded-xl border p-4 bg-white">
      <h2 className="font-semibold text-slate-900">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((i) => (
            <div key={i.label} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 capitalize">{i.label}</span>
                <span className="font-medium text-slate-900">
                  {i.value}{" "}
                  <span className="text-xs text-slate-500">{valueLabel}</span>
                </span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900"
                  style={{ width: `${Math.round((i.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
