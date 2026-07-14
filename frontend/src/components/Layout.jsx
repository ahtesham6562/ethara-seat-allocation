import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import ChatWidget from "./ChatWidget.jsx";

const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  employees: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a6 6 0 0 0-2.2-4.6" />
    </svg>
  ),
  seats: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
      <rect x="4" y="10" width="16" height="7" rx="2" />
      <path d="M7 17v3M17 17v3" />
    </svg>
  ),
};

const links = [
  { to: "/", label: "Dashboard", icon: icons.dashboard, end: true },
  { to: "/employees", label: "Employees", icon: icons.employees },
  { to: "/seats", label: "Seats", icon: icons.seats },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b">
        <div className="font-bold text-lg text-brand-600">
          Ethara <span className="text-gray-400 font-normal">Seats</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            {l.icon}
            {l.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t p-3">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-2">
              <span className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-semibold text-sm">
                {user.name?.[0]?.toUpperCase() || "?"}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-gray-400 uppercase">{user.role}</div>
              </div>
            </div>
            <button
              className="btn-ghost w-full text-sm"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button className="btn-primary w-full" onClick={() => navigate("/login")}>
            Login
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-64 z-20">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-64 z-40 transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      {/* Content */}
      <div className="md:pl-64">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 bg-white border-b flex items-center px-4 gap-3 sticky top-0 z-10">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-brand-600">Ethara Seats</span>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>

      {/* AI assistant: floating popup, available on every page */}
      <ChatWidget />
    </div>
  );
}
