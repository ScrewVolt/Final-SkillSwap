import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-600">
          Welcome back, <span className="font-medium text-slate-800">{user?.name}</span>.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/skills"
          className="rounded-xl border bg-white p-4 hover:shadow-sm transition"
        >
          <div className="font-semibold text-slate-900">My Skills</div>
          <p className="mt-1 text-sm text-slate-600">
            Create or manage skills you offer.
          </p>
        </Link>

        <Link
          to="/skills/find"
          className="rounded-xl border bg-white p-4 hover:shadow-sm transition"
        >
          <div className="font-semibold text-slate-900">Find Skills</div>
          <p className="mt-1 text-sm text-slate-600">
            Search for students who can help you.
          </p>
        </Link>

        <Link
          to="/sessions"
          className="rounded-xl border bg-white p-4 hover:shadow-sm transition"
        >
          <div className="font-semibold text-slate-900">Sessions</div>
          <p className="mt-1 text-sm text-slate-600">
            View, schedule, and manage session requests.
          </p>
        </Link>

        <Link
          to="/availability"
          className="rounded-xl border bg-white p-4 hover:shadow-sm transition"
        >
          <div className="font-semibold text-slate-900">Availability</div>
          <p className="mt-1 text-sm text-slate-600">
            Set times when you are available to help.
          </p>
        </Link>
      </div>

      {/* How It Works */}
      <div className="mt-8 rounded-xl border bg-white p-6">
        <div className="font-semibold text-slate-900">How SkillSwap Works</div>

        <ol className="mt-3 space-y-2 text-sm text-slate-700 list-decimal pl-5">
          <li>Create skills you can offer to other students.</li>
          <li>Browse and request help from students offering skills.</li>
          <li>Schedule a session using shared availability.</li>
          <li>Complete the session and leave feedback.</li>
        </ol>
      </div>

      {/* Admin Hint */}
      {user?.role === "admin" && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="font-semibold text-amber-800">
            Admin Tools Available
          </div>
          <p className="mt-1 text-sm text-amber-700">
            You can manage users, sessions, reports, and skill moderation from the admin menu.
          </p>
        </div>
      )}
    </div>
  );
}
