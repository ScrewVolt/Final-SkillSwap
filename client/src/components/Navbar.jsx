import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import NotificationsBell from "./NotificationsBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    [
      "text-slate-700 hover:text-slate-900",
      isActive ? "font-semibold text-slate-900" : "",
    ].join(" ");

  const mobileLinkClass = ({ isActive }) =>
    [
      "block rounded-md px-3 py-2 text-sm",
      isActive
        ? "bg-slate-900 text-white"
        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
    ].join(" ");

  const authedLinks = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/skills/find", label: "Find Skills" },
      { to: "/skills", label: "My Skills" },
      { to: "/sessions", label: "Sessions" },
      { to: "/availability", label: "Availability" },
    ],
    []
  );

  const adminLinks = useMemo(
    () => [
      { to: "/admin/reports", label: "Reports" },
      { to: "/admin/users", label: "Users" },
      { to: "/admin/sessions", label: "All Sessions" },
      { to: "/admin/skills", label: "Moderate Skills" },
    ],
    []
  );

  const isAdmin = user?.role === "admin";

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link to="/" className="font-bold text-slate-900" onClick={closeMenu}>
            SkillSwap
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <NavLink to="/" className={linkClass}>
              Home
            </NavLink>

            {user ? (
              <>
                {authedLinks.map((l) => (
                  <NavLink key={l.to} to={l.to} className={linkClass}>
                    {l.label}
                  </NavLink>
                ))}

                {isAdmin && (
                  <>
                    <span className="mx-2 text-slate-300">|</span>
                    {adminLinks.map((l) => (
                      <NavLink key={l.to} to={l.to} className={linkClass}>
                        {l.label}
                      </NavLink>
                    ))}
                  </>
                )}

                <NotificationsBell />

                <button
                  onClick={logout}
                  className="ml-2 rounded-md bg-slate-900 px-3 py-1.5 text-white hover:opacity-90"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  Login
                </NavLink>

                <Link
                  to="/register"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:opacity-90"
                >
                  Register
                </Link>
              </>
            )}
          </nav>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 md:hidden">
            {user && <NotificationsBell />}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div id="mobile-nav" className="md:hidden border-t pb-3 pt-3">
            <div className="flex flex-col gap-1">
              <NavLink to="/" className={mobileLinkClass} onClick={closeMenu}>
                Home
              </NavLink>

              {user ? (
                <>
                  <div className="mt-2 px-3 text-xs font-semibold text-slate-500">
                    App
                  </div>
                  {authedLinks.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      className={mobileLinkClass}
                      onClick={closeMenu}
                    >
                      {l.label}
                    </NavLink>
                  ))}

                  {isAdmin && (
                    <>
                      <div className="mt-3 px-3 text-xs font-semibold text-slate-500">
                        Admin
                      </div>
                      {adminLinks.map((l) => (
                        <NavLink
                          key={l.to}
                          to={l.to}
                          className={mobileLinkClass}
                          onClick={closeMenu}
                        >
                          {l.label}
                        </NavLink>
                      ))}
                    </>
                  )}

                  <div className="mt-3 px-3">
                    <button
                      onClick={() => {
                        closeMenu();
                        logout();
                      }}
                      className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm text-white hover:opacity-90"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-2 grid gap-2 px-3">
                  <NavLink
                    to="/login"
                    className={mobileLinkClass}
                    onClick={closeMenu}
                  >
                    Login
                  </NavLink>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="rounded-md bg-slate-900 px-3 py-2.5 text-center text-sm text-white hover:opacity-90"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
