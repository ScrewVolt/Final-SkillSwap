import { useEffect, useRef, useState } from "react";
import { api } from "../api/http";
import { Link } from "react-router-dom";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  async function refreshCounts() {
    const c = await api("/notifications/unread-count");
    setUnread(c.unread || 0);
  }

  async function loadList() {
    setLoading(true);
    try {
      const list = await api("/notifications?limit=15");
      setItems(Array.isArray(list) ? list : []);
      await refreshCounts();
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id) {
    await api(`/notifications/${id}/read`, { method: "POST" });
    await loadList();
  }

  async function markAllRead() {
    await api("/notifications/read-all", { method: "POST" });
    await loadList();
  }

  // Poll unread count every 10s (simple + effective)
  useEffect(() => {
    refreshCounts();
    const t = setInterval(refreshCounts, 10000);
    return () => clearInterval(t);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={async () => {
          const next = !open;
          setOpen(next);
          if (next) await loadList();
        }}
        className="relative rounded-md px-2 py-2 hover:bg-slate-100"
        title="Notifications"
      >
        {/* simple bell */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 17H9m10-5V9a7 7 0 10-14 0v3l-2 2h18l-2-2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl border bg-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold text-slate-900">Notifications</div>
            <button
              onClick={markAllRead}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[380px] overflow-auto">
            {loading ? (
              <div className="p-4 text-slate-600">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-slate-600">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-b-0 ${
                    n.is_read ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{n.title}</div>
                      {n.body && <div className="text-sm text-slate-600 mt-1">{n.body}</div>}
                      <div className="text-xs text-slate-500 mt-2">
                        {new Date(n.created_at).toLocaleString()}
                      </div>

                      {(n.session_request_id || n.skill_id) && (
                        <div className="mt-2 flex gap-3 text-sm">
                          <Link to="/sessions" className="text-slate-900 underline">
                            View Sessions
                          </Link>
                          <Link to="/skills" className="text-slate-900 underline">
                            View Skills
                          </Link>
                        </div>
                      )}
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-sm text-slate-700 hover:text-slate-900"
                      >
                        Read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
