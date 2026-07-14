import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/employees", label: "Employees" },
  { to: "/seats", label: "Seats" },
  { to: "/assistant", label: "AI Assistant" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="font-bold text-lg text-brand-600">
              Ethara <span className="text-gray-400 font-normal">Seats</span>
            </div>
            <nav className="flex gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="text-gray-500">
                  {user.name}
                  <span className="ml-2 badge bg-brand-50 text-brand-700 uppercase">
                    {user.role}
                  </span>
                </span>
                <button
                  className="btn-ghost text-sm"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button className="btn-primary" onClick={() => navigate("/login")}>
                Login
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
