import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import { useAuth } from "../auth/useAuth";

import { Link } from "react-router-dom";

export default function Skills() {
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [type, setType] = useState("all"); // all | offer | seek
  const [myOnly, setMyOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (type !== "all") p.set("type", type);

    if (myOnly && user?.id) {
      p.set("userId", String(user.id));
      p.set("includePrivate", "true"); // allowed for owner
    }
    return p.toString();
  }, [q, type, myOnly, user?.id]);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await api(`/api/skills${params ? `?${params}` : ""}`);
      setSkills(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(skillId) {
    if (!confirm("Delete this skill?")) return;
    try {
      await api(`/api/skills/${skillId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function requestSession(skillId) {
    const msg = prompt("Send a message with your request (optional):", "Hey! Are you available this week?");
    try {
      await api("/sessions", {
        method: "POST",
        body: JSON.stringify({ skill_id: skillId, message: msg || "" }),
      });
      alert("Request sent!");
    } catch (e) {
      alert(e.message);
    }
  }


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Skills Directory</h1>
          <p className="text-slate-600 mt-1">
            Search for skills students offer or request. Use “My skills” to view private entries.
          </p>
        </div>

        <Link
          to="/skills/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:opacity-90"
        >
          + New Skill
        </Link>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Search</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="Try: algebra, chemistry, web design..."
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
            <option value="all">All</option>
            <option value="offer">Offers</option>
            <option value="seek">Requests</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          id="myOnly"
          type="checkbox"
          className="h-4 w-4"
          checked={myOnly}
          onChange={(e) => setMyOnly(e.target.checked)}
        />
        <label htmlFor="myOnly" className="text-sm text-slate-700">
          My skills (includes private)
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="text-slate-600">Loading skills...</div>
        ) : skills.length === 0 ? (
          <div className="rounded-xl border p-6 text-slate-600">
            No skills found. Try changing filters or create the first one.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {skills.map((s) => (
              <div key={s.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.type === "offer"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                      >
                        {s.type === "offer" ? "Offer" : "Request"}
                      </span>

                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${s.visibility === "private"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                      >
                        {s.visibility}
                      </span>
                    </div>

                    <h2 className="mt-2 font-semibold text-slate-900">{s.title}</h2>
                    {s.description && (
                      <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                    )}

                    {s.tags && (
                      <p className="mt-2 text-xs text-slate-500">
                        Tags: {s.tags}
                      </p>
                    )}
                  </div>

                  {(user?.id === s.user_id) && (
                    <button
                      onClick={() => onDelete(s.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      Delete
                    </button>
                  )}
                  {user?.id !== s.user_id && (
                    <button
                      onClick={() => requestSession(s.id)}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:opacity-90"
                    >
                      Request Session
                    </button>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
