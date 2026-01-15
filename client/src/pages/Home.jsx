export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">SkillSwap</h1>
      <p className="mt-2 text-slate-600">
        A student talent exchange platform where students offer skills, request help,
        schedule sessions, and leave feedback. Included with admin monitoring for safety.
      </p>

      {/* ✅ Rubric Identity Block */}
      <div className="mt-6 rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              BPA Web Application Submission
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Chapter: <span className="font-medium text-slate-800">Alamogordo BPA</span>
            </div>
            <div className="text-sm text-slate-600">
              Theme: <span className="font-medium text-slate-800">Discover Your Potential</span>
            </div>
          </div>

          <div className="text-sm text-slate-600 sm:text-right">
            <div>
              School: <span className="font-medium text-slate-800">Alamogordo High School</span>
            </div>
            <div>
              Location:{" "}
              <span className="font-medium text-slate-800">Alamogordo, New Mexico</span>
            </div>
            <div>
              Year: <span className="font-medium text-slate-800">2026</span>
            </div>
          </div>
        </div>

        <div className="mt-3 border-t pt-3">
          <div className="text-sm font-semibold text-slate-900">Team Members</div>
          <ul className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li className="rounded-md bg-slate-50 px-3 py-2">Miguel Garza</li>
            <li className="rounded-md bg-slate-50 px-3 py-2">Brennen Pannell</li>
            <li className="rounded-md bg-slate-50 px-3 py-2">Diego Ochoa</li>
            <li className="rounded-md bg-slate-50 px-3 py-2">William Shirk</li>
          </ul>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold text-slate-900">Offer Skills</div>
          <p className="mt-1 text-sm text-slate-600">Share what you can teach.</p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold text-slate-900">Request Sessions</div>
          <p className="mt-1 text-sm text-slate-600">Find help and schedule time.</p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold text-slate-900">Feedback</div>
          <p className="mt-1 text-sm text-slate-600">Ratings + reviews after sessions.</p>
        </div>
      </div>
    </div>
  );
}
